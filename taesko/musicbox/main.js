const MAX_VIDEO_RESULTS = 10;
const YOUTUBE_API_URLS = {
  'channels': 'https://www.googleapis.com/youtube/v3/channels',
  'playlistItems': 'https://www.googleapis.com/youtube/v3/playlistItems'
};
const YOUTUBE_API_ASSERTS = {
  'channels': (response) => {
    PeerError.assert(
      hasChainedProperties(['items'], response) &&
      response.items.length !== 0 &&
      hasChainedProperties([
          'snippet.title',
          'snippet.customUrl',
          'id',
          'contentDetails.relatedPlaylists.uploads'],
        response.items[0]
      ),
      'Missing properties in channels.list response:', response
    );
  },
  'playlistItems': response => {
    for (let item of response.items) {
      PeerError.assert(
        hasChainedProperties(['snippet.title', 'snippet.publishedAt'], item),
        'Youtube API has missing properties for response.items object of playlistItems resposne',
        response
      );
    }
  }
};
const YOUTUBE_API_KEY = 'AIzaSyAHhFtmNEo9TwEN90p6yyZg43_4MKCiyyQ';
const YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/user/';
const LAST_FM_API_URL = 'http://ws.audioscrobbler.com/2.0/';
const LAST_FM_API_KEY = 'c2933b27a78e04c4b094a1a094bc2c9c';

const loadingParagraph = document.getElementById('loading-bar');
const statusParagraph = document.getElementById('status-bar');
const noContentParagraph = document.getElementById('no-content-message');
const lastWeekFilter = document.getElementById('last-week-filter');
const lastMonthFilter = document.getElementById('last-month-filter');
const lastYearFilter = document.getElementById('last-year-filter');
const filterHash = {
  7: lastWeekFilter,
  30: lastMonthFilter,
  365: lastYearFilter
};
const subscriptionSelect = document.getElementById('sub-select');
const globalSubscriptions = {};
let modifyingSubscriptions = false;

class BasicError extends Error {
  constructor (...logs) {
    super(logs.join('\n'));
  }

  static assert (condition, ...messages) {
    if (!condition) {
      throw new this(...messages);
    }
  }
}

class ApplicationError extends BasicError {
  constructor (...logs) {
    super(...logs);

    this.userMessage = 'An unexpected behaviour was encountered. Please refresh the page.';
  }
}

class PeerError extends BasicError {
  constructor (...logs) {
    super(...logs);

    this.userMessage = 'Service is not available at the moment. Please try again later.';
  }
}

class UserError extends BasicError {
  constructor (userMessage, ...logs) {
    super('User error: ', userMessage, ...logs);

    this.userMessage = userMessage;
  }
}

class SystemError extends BasicError {
  constructor (...logs) {
    super(...logs);

    this.userMessage = 'Our service is not supported on your browser. Consider upgrading and trying again.';
  }
}

window.addEventListener('error', function (error) {
  handleError(error);
  return true;
});

window.addEventListener('load', function () {
  let form = document.getElementById('url-form');
  let button = document.getElementById('unsubscribe-all-btn');

  setupSubEvents(form, button);
  setupFiltering();
});

async function loadAndDisplayTracks (sub) {
  const promises = Object.values(sub.tracks)
    .filter(sub.filterFunc)
    .map(async track => {
      try {
        await track.loadData();
      } catch (e) {
        handleError(e);
        return;
      }
      TableAPI.displaySubTrackInfo(sub,
        track
      );
    });

  await Promise.all(promises);
}

async function subscribe (url, until) {
  console.log('subscribing for ', url, 'until', until);

  let sub = await getSubscription(url, until);

  // it's possible for a race condition to occur where
  // getSubscription returns twice two different subscriptions
  // to the same channel, because different urls can point to the same channel.
  if (globalSubscriptions[sub.id]) {
    return;
  }

  let option = document.createElement('option');

  option.value = url;
  option.innerHTML = sub.title;
  subscriptionSelect.appendChild(option);
  globalSubscriptions[sub.id] = sub;
  UrlList.display(sub);
  TableAPI.displaySub(sub);
  TableAPI.showTable();

  await loadAndDisplayTracks(sub);
}

function unsubscribe (url) {
  let sub = getSubByFullURL(url);

  for (let k = 0; k < subscriptionSelect.children.length; k++) {
    let option = subscriptionSelect.children[k];

    if (option.value.toLowerCase() === url.toLowerCase()) {
      option.remove();
      break;
    }
  }

  if (sub) {
    delete globalSubscriptions[sub.id];
    UrlList.hide(sub);
  } else {
    console.warn('Already unsubscribed from ', url);
  }

  TableAPI.removeSub(sub);
}

function unsubscribeAll () {
  TableAPI.clearTable();

  for (let [key, sub] of Object.entries(globalSubscriptions)) {
    delete globalSubscriptions[key];
    UrlList.hide(sub);
  }

  while (subscriptionSelect.firstChild) {
    subscriptionSelect.removeChild(subscriptionSelect.firstChild);
  }
}

// TODO put this at the subscribe/unsubscribe functions instead of closures around their usages
// TODO fix nesting of lock decorators ?
function lockDecorator (wrapped) {
  return buttonLock(
    (...args) => {
      UserError.assert(!modifyingSubscriptions, 'Please wait for subscriptions to load.');

      modifyingSubscriptions = true;

      try {
        wrapped(...args);
      } finally {
        modifyingSubscriptions = false;
      }
    }
  );
}

function asyncLockDecorator (wrapped) {
  function decorated (...args) {
    let promise;

    if (modifyingSubscriptions) {
      promise = Promise.reject(new UserError('Please wait for subscriptions to load.'));
    } else {
      modifyingSubscriptions = true;
      promise = wrapped(...args);
      promise.then(unlock, unlock);
    }

    return promise;
  }

  function unlock () {
    modifyingSubscriptions = false;
  }

  return buttonLock(decorated);
}

function buttonLock (func) {
  const inputs = [
    lastWeekFilter,
    lastMonthFilter,
    lastYearFilter,
    document.getElementById('urls-input'),
    document.getElementById('subscribe-btn'),
    document.getElementById('unsubscribe-all-btn')
  ];
  ApplicationError.assert(inputs.every(element => !!element),
    'An unexpected error occurred. Please refresh the page.'
  );

  return async (...args) => {
    for (let i = 0; i < inputs.length; i++) {
      inputs[i].disabled = true;
    }
    try {
      return await func(...args);
    } finally {
      for (let i = 0; i < inputs.length; i++) {
        inputs[i].disabled = false;
      }
    }
  };
}

const getNextID = (() => {
  const generator = (function * uniqueIDGenerator () {
    let count = 1;
    while (true) {
      yield count++;
    }
  })();

  return () => generator.next().value;
})();


function fetchJSONP (url, params) {
  return new Promise((resolve, reject) => {
    let callbackName = 'jsonp' + new Date().getTime() + getNextID();

    params['callback'] = callbackName;

    window[callbackName] = jsonData => {
      if (jsonData.error) {
        reject(jsonData.message);
      } else {
        resolve(jsonData);
      }
    };

    let script = document.createElement('script');
    script.src = url + queryString(params);
    document.getElementsByTagName('head')[0].appendChild(script);
  });
}

async function getSubscription (url, until = 30) {
  let subscription = getSubByFullURL(url);

  if (subscription === undefined) {
    // let errors propagate to the caller.
    subscription = await fetchChannel(url);
  }

  subscription = await downloadIntoSubscription(subscription, until);

  return subscription;
}

async function downloadIntoSubscription (subscription, until) {
  if (subscription.fetchedUntil && until <= subscription.fetchedUntil) {
    console.log('already downloaded subscription until', until, subscription);
    return subscription;
  }

  let trackResponse = await fetchTracks(subscription.playlistId, until, subscription.pageToken);

  subscription.tracks = subscription.tracks || [];
  subscription.tracks.push(...trackResponse.tracks);
  subscription.tracks = removeDuplicates(subscription.tracks, track => track.id);
  subscription.failedToParse = trackResponse.failures;
  subscription.filterFunc = track => true;
  subscription.filterElement = filterHash[until];
  subscription.pageToken = trackResponse.pageToken;
  subscription.fetchedUntil = until;

  return subscription;
}

async function fetchChannel (url) {
  let channelInformation = {};
  let identifiers = parseChannelFromYTUrl(url);
  let params = {};

  channelInformation.originalUrl = url;

  if (identifiers.hasOwnProperty('id') && identifiers.id.length !== 0) {
    params = {
      part: 'snippet, contentDetails',
      id: identifiers.id
    };
  } else if (identifiers.hasOwnProperty('name') &&
             identifiers.name.length !== 0) {
    params = {
      part: 'snippet, contentDetails',
      forUsername: identifiers.name
    };
  } else {
    throw new UserError(
      `Youtube url - ${url} is not a link to a channel.`,
      'User tried to subscribe to incorrect url:', url
    );
  }

  let response = await fetchFromYtAPI('channels', params);

  let item = response.items[0];

  channelInformation.id = item.id;
  channelInformation.title = item.snippet.title;
  channelInformation.customUrl = item.snippet.customUrl;
  channelInformation.playlistId = item.contentDetails.relatedPlaylists.uploads;

  return channelInformation;
}

async function fetchFromYtAPI (method, params) {
  let response;

  params = Object.assign(params, {
    key: YOUTUBE_API_KEY
  });

  try {
    response = await window.fetch(YOUTUBE_API_URLS[method] + queryString(params));
  } catch (e) {
    throw new PeerError('Youtube API for playlistItems failed. Reason: ', e);
  }

  PeerError.assert(response.ok,
    'Youtube API for playlistItems failed with a not ok response: ',
    response
  );

  let content;

  try {
    content = await response.json();
  } catch (reason) {
    throw new PeerError(
      'Failed to decode json from Youtube API for playlistItems.',
      'Reason: ', reason
    );
  }

  YOUTUBE_API_ASSERTS[method](content);

  return content;
}

async function fetchVideos (playlistId, untilDays, pageToken) {
  let items = [];
  let params = {
    maxResults: MAX_VIDEO_RESULTS,
    part: 'snippet,contentDetails',
    playlistId: playlistId
  };
  let untilDate = new Date();
  let lastPageToken;

  if (pageToken) {
    params.pageToken = pageToken;
  }
  untilDate.setDate(untilDate.getDate() - untilDays);

  do {
    let response = await fetchFromYtAPI('playlistItems', params);

    lastPageToken = params.pageToken;
    params.pageToken = response.nextPageToken;

    let newItems = response.items.filter(
      item => new Date(item.snippet.publishedAt).getTime() >= untilDate.getTime()
    );

    items.push(...newItems);

    if (newItems.length !== response.items.length) {
      break;
    }
  } while (params.pageToken);

  return {
    items,
    pageToken: lastPageToken
  };
}

async function fetchTracks (playlistId, until, pageToken) {
  let items;
  let tracks = [];
  let failures = [];

  ({items, pageToken} = await fetchVideos(playlistId, until, pageToken));

  for (let item of items) {
    let parsed = parseTrackFromVideoTitle(item.snippet.title);

    if (parsed.artist && parsed.track) {
      tracks.push(
        new Track({
          artist: parsed.artist,
          title: parsed.track,
          featuring: parsed.feat,
          publishedAt: item.snippet.publishedAt
        })
      );
    } else {
      failures.push(item.snippet.title);
    }
  }

  return {tracks, failures, pageToken};
}

function getSubByCustomURL (customUrl) {
  customUrl = customUrl.toLowerCase();

  for (let sub of Object.values(globalSubscriptions)) {
    if (sub.customUrl.toLowerCase() === customUrl) {
      return sub;
    }
  }
}

function getSubByFullURL (url) {
  let parsed = parseChannelFromYTUrl(url);

  if (parsed.id && globalSubscriptions[parsed.id]) {
    return globalSubscriptions[parsed.id];
  } else if (parsed.name) {
    let sub = getSubByCustomURL(parsed.name);

    if (sub) {
      return sub;
    }
  }
}

class Track {
  constructor ({artist, title, featuring, publishedAt}) {
    // url, duration, artistUrl, album properties are loaded and attached through the loadData async method
    this.id = artist + title;
    this.name = title;
    this.artistName = artist;
    this.featuring = featuring;
    this.publishedAt = new Date(publishedAt);
    this.hasLoaded = false;
  }

  trackInfoUrlParams () {
    return {
      method: 'track.getInfo',
      format: 'json',
      api_key: LAST_FM_API_KEY,
      artist: this.artistName,
      track: this.name
    };
  }

  async loadData () {
    if (this.hasLoaded) {
      return;
    }

    let response;

    try {
      response = await fetchJSONP(
        LAST_FM_API_URL,
        this.trackInfoUrlParams()
      );
    } catch (error) {
      const err = new PeerError('fetchJSONP raised error: ', error);

      err.userMessage = `Couldn't download data from last.fm for track: ${this.name}`;

      throw err;
    }

    PeerError.assert(response.track,
      'missing track property in last fm resposne: ', response
    );

    this.name = response.track.name;
    this.duration = response.track.duration;
    this.url = response.track.url;
    this.artistUrl = response.track.artist.url;
    this.album = response.track.album;

    this.hasLoaded = true;
  }
}

function parseUrlsFromString (str) {
  // taken from https://stackoverflow.com/questions/6038061/regular-expression-to-find-urls-within-a-string
  let regex = new RegExp(
    '(http|ftp|https)://([\\w_-]+(?:(?:\\.[\\w_-]+)+))([\\w.,@?^=%&:/~+#-]*[\\w@?^=%&/~+#-])?',
    'g'
  );
  let urls = [];
  let match = regex.exec(str);

  while (match) {
    urls.push(match[0]);
    match = regex.exec(str);
  }

  return urls;
}

function parseChannelFromYTUrl (url) {
  let idResult = new RegExp('www.youtube.com/channel/([^/]+)').exec(url); // TODO parses query params incorrectly
  let userResult = new RegExp('www.youtube.com/user/([^/]+)').exec(url);

  if (idResult) {
    return {
      id: idResult[1],
      type: 'id'
    };
  } else if (userResult) {
    return {
      name: userResult[1],
      type: 'username'
    };
  } else {
    return {};
  }
}

function parseTrackFromVideoTitle (videoTitle) {
  let regex = /\s*([^_]+)\s+-\s+([^()]+)\s*/;
  let featuringRegex = /(?:ft\.|feat\.)\s*(.*)/;
  let featMatch = featuringRegex.exec(videoTitle);
  let feat;

  if (featMatch) {
    videoTitle = videoTitle.replace(featMatch[0], '');
    feat = featMatch[1];
  }

  let result = regex.exec(videoTitle);

  if (!result) {
    console.log('Could not parse title ' + videoTitle);

    return {};
  }

  result = result.map(ele => {
    if (ele) {
      return ele.trim();
    }

    return ele;
  });

  return {artist: result[1], track: result[2], feat};
}

const TableAPI = {
  table: document.getElementsByClassName('table')[0],
  tableBody: document.querySelector('table tbody'),
  tableItemTemplate: document.getElementById('table-row-template'),
  rowElements: {}, // refactor subs to tracks

  isSubDisplayed: sub => !!TableAPI.rowElements[sub.id],

  displayDataIntoCells: (headers, sub, track, cells) => {
    const order = TableAPI.headerOrder();

    for (let header of headers) {
      let index = order[header];
      TableAPI.preparations[header](
        sub,
        track,
        cells[index]
      );
    }
  },

  displaySub: sub => {
    if (TableAPI.isSubDisplayed(sub)) {
      console.warn(
        'Sub is already displayed but tried to display it again. Sub: ',
        sub
      );

      return;
    }

    TableAPI.rowElements[sub.id] = [];

    const tracks = sub.tracks.filter(sub.filterFunc);

    for (let track of tracks) {
      let row = TableAPI.tableItemTemplate.cloneNode(true);

      TableAPI.displayDataIntoCells(['channel', 'artist', 'published-at'], sub, track, row.cells);
      row.setAttribute('data-track-id', track.id);

      row.classList.remove('hidden');
      row.removeAttribute('id');

      TableAPI.rowElements[sub.id].push(row);
      TableAPI.tableBody.appendChild(row);
    }
  },

  displaySubTrackInfo: (sub, track) => {
    let rows = TableAPI.rowElements[sub.id];

    ApplicationError.assert(
      rows,
      'Trying to display track info for sub', sub, 'but it has no rows'
    );

    const row = rows.find(element => element.getAttribute('data-track-id') === track.id);
    TableAPI.displayDataIntoCells(['artist', 'album', 'track', 'length'], sub, track, row.cells);
  },

  removeSub: sub => {
    if (!TableAPI.rowElements[sub.id]) {
      return;
    }

    for (let row of TableAPI.rowElements[sub.id]) {
      row.remove();
    }

    delete TableAPI.rowElements[sub.id];
  },

  refresh: sub => {
    TableAPI.removeSub(sub);
    TableAPI.displaySub(sub);
  },

  hookDialogEvents: (cell) => {
    let dialogElement = cell.getElementsByTagName('dialog')[0];

    if (!dialogElement) {
      return;
    }

    dialogElement.setAttribute('id', 'dialog-' + getNextID());
    cell.addEventListener('click', () => {
      // does not work in firefox 60.0.2 for Ubunutu
      SystemError.assert(dialogElement.showModal && dialogElement.close,
        `We're sorry but displaying extra 
                    information is not supported in your browser. 
                    Please use another (chrome).`
      );

      dialogElement.showModal();
    });

    dialogElement.getElementsByTagName('button')[0]
      .addEventListener('click', () => dialogElement.close());
  },

  headerOrder: () => {
    return Object.entries(Array.from(TableAPI.table.getElementsByTagName('th')))
      .map(([index, header]) => [header.getAttribute('id'), index])
      .reduce((hash, entry) => {
          hash[entry[0]] = entry[1];

          return hash;
        },
        {}
      );
  },

  preparations: {
    'channel': (sub, track, cell) => {
      let link = cell.getElementsByTagName('a')[0];

      link.textContent = getProp('title', sub, '');
      link.setAttribute('href', YOUTUBE_CHANNEL_URL + sub.customUrl);
    },
    'artist': (sub, track, cell) => {
      let link = cell.getElementsByTagName('a')[0];

      link.textContent = track.artistName;
      link.setAttribute('href', track.artistUrl);
    },
    'album': (sub, track, cell) => {
      let title = getProp('album.title', track, '');
      let titleElement = cell.getElementsByTagName('p')[0];
      let dialog = cell.getElementsByTagName('dialog')[0];

      titleElement.textContent = title;

      let imageSrc = '';

      if (hasChainedProperties(['album.image'], track)) {
        for (let image of track.album.image) {
          if (image['#text']) {
            imageSrc = image['#text'];
          }
        }
      }

      if (imageSrc) {
        dialog.getElementsByTagName('img')[0].setAttribute('src', imageSrc);
        TableAPI.hookDialogEvents(cell);
      } else {
        dialog.remove();
      }
    },
    'track': (sub, track, cell) => {
      cell.appendChild(
        document.createTextNode(getProp('name', track, ''))
      );
    },
    'published-at': (sub, track, cell) => {
      let publishedAt = getProp('publishedAt', track, '');
      publishedAt = `${publishedAt.getFullYear()}-${publishedAt.getMonth()}-${publishedAt.getDate()}`;

      cell.appendChild(
        document.createTextNode(publishedAt)
      );
    },
    'length': (sub, track, cell) => {
      let duration = parseInt(getProp('duration', track, '0'));

      if (duration !== 0) {
        duration = (duration / 1000 / 60).toFixed(2)
          .replace('.', ':')
          .padStart(5, '0');
      } else {
        duration = '';
      }

      cell.appendChild(
        document.createTextNode(duration)
      );
    }
  },
  showTable: () => {
    TableAPI.table.classList.remove('hidden');
    noContentParagraph.classList.add('hidden');
  },

  hideTable: () => {
    TableAPI.table.classList.add('hidden');
    noContentParagraph.classList.remove('hidden');
    noContentParagraph.textContent = '';
  },

  clearTable: () => {
    for (let sub of Object.keys(TableAPI.rowElements)) {
      TableAPI.removeSub(sub);
    }

    TableAPI.hideTable();
  }

};

const UrlList = {

  listElements: new WeakMap(),

  isDisplayed: sub => UrlList.listElements.has(sub),

  newItem: sub => {
    let itemTemplate = document.getElementById('url-list-item-template');
    let newItem = itemTemplate.cloneNode(true);

    newItem.childNodes[0].nodeValue = sub.title;
    newItem.childNodes[1].addEventListener('click',
      lockDecorator(() => {
          unsubscribe(sub.originalUrl);
        }
      )
    );

    newItem.classList.remove('hidden');
    newItem.removeAttribute('id');

    return newItem;
  },

  display: sub => {
    if (UrlList.isDisplayed(sub)) {
      return;
    }

    let listItem = UrlList.newItem(sub);

    document.getElementById('url-list')
      .appendChild(listItem);
    UrlList.listElements.set(sub, listItem);
  },

  hide: sub => {
    UrlList.listElements.get(sub)
      .remove();
    UrlList.listElements.delete(sub);
  }
};

function getUntilDaysInput () {
  for (let [days, element] of Object.entries(filterHash)) {
    if (element.checked) {
      return days;
    }
  }
}

function setupFiltering () {
  const lastWeek = new Date();
  const lastMonth = new Date();
  const lastYear = new Date();

  lastWeek.setDate(lastWeek.getDate() - 7);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  lastYear.setFullYear(lastYear.getFullYear() - 1);

  function makeFilter (maxDays) {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() - maxDays);

    return track => {
      return track.publishedAt.getTime() > maxDate.getTime();
    };
  }

  const filterFuncHash = {
    'last-week-filter': {
      filterFunc: makeFilter(7),
      until: 7
    },
    'last-month-filter': {
      filterFunc: makeFilter(30),
      until: 30
    },
    'last-year-filter': {
      filterFunc: makeFilter(365),
      until: 365
    }
  };

  const selectedFilter = asyncLockDecorator(async (event) => {
    if (!subscriptionSelect.options || subscriptionSelect.options.length === 0) {
      return;
    }

    let subUrl = subscriptionSelect.options[subscriptionSelect.selectedIndex].value;
    let sub = getSubByFullURL(subUrl);
    let {filterFunc, until} = filterFuncHash[event.target.getAttribute('id')];

    sub = await downloadIntoSubscription(sub, until);
    sub.filterFunc = filterFunc;
    sub.filterElement = event.target;
    TableAPI.refresh(sub);
    console.log('successfully refreshed');
    await loadAndDisplayTracks(sub);
  });

  function selectedSubscription (event) {
    if (!subscriptionSelect.options || subscriptionSelect.options.length ===
        0) {
      return;
    }

    let subUrl = subscriptionSelect.options[subscriptionSelect.selectedIndex].value;
    let sub = getSubByFullURL(subUrl);
    if (sub.filterElement !== undefined) {
      sub.filterElement.checked = true;
    }
  }

  subscriptionSelect.addEventListener('change', selectedSubscription);
  lastWeekFilter.addEventListener('click', selectedFilter);
  lastMonthFilter.addEventListener('click', selectedFilter);
  lastYearFilter.addEventListener('click', selectedFilter);
}

function setupSubEvents (form, button) {
  const submitUrls = asyncLockDecorator(async (urls) => {
    let promises = urls.map(async (url) => {
      return subscribe(url, getUntilDaysInput());
    });

    loadingParagraph.textContent = 'Loading...';

    try {
      await Promise.all(promises);
    } finally {
      loadingParagraph.textContent = '';
    }
  });

  async function processForm (e) {
    if (e.preventDefault) {
      e.preventDefault();
    }

    let urls = parseUrlsFromString(
      document.getElementById('urls-input').value);

    if (!Array.isArray(urls) || urls.length === 0) {
      displayMessage('Please enter valid youtube channel urls.');
      return false;
    }

    await submitUrls(urls);

    // return false to prevent the default form behavior
    return false;
  }

  if (form.attachEvent) {
    form.attachEvent('submit', processForm);
  } else {
    form.addEventListener('submit', processForm);
  }

  button.addEventListener('click', lockDecorator(unsubscribeAll));
}

function queryString (params) {
  let string = '?';

  for (let [key, entry] of Object.entries(params)) {
    string += `${encodeURIComponent(key)}=${encodeURIComponent(entry)}&`;
  }

  return string;
}

function displayMessage (msg) {
  if (statusParagraph.timeout) {
    clearTimeout(statusParagraph.timeout);
  }

  statusParagraph.textContent = msg;

  statusParagraph.timeout = setTimeout(
    () => { statusParagraph.textContent = ''; },
    5000
  );
}

function handleError (error) {
  displayMessage(error.userMessage);
  console.error(error);
}

function hasChainedProperties (chainedProperties, object) {
  for (let chainedProp of chainedProperties) {
    let properties = chainedProp.split('.');
    let chainedObject = object;

    for (let prop of properties) {
      if (chainedObject[prop] === undefined) {
        return false;
      }

      chainedObject = chainedObject[prop];
    }
  }

  return true;
}

function removeDuplicates (array, iteratee) {
  const hash = array.map(element => [iteratee(element), element])
    .reduce((hash, entry) => {
        hash[entry[0]] = entry[1];
        return hash;
      },
      {}
    );
  return Object.values(hash);
}

function getProp (chainedProp, object, default_) {
  for (let prop of chainedProp.split('.')) {
    if (object[prop]) {
      object = object[prop];
    } else {
      return default_;
    }
  }

  return object;
}
