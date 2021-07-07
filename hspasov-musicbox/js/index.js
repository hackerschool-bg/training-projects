'use strict';

const DEBUG_MODE = true;

// YT = YouTube
const YT_API_CHANNELS = 'https://www.googleapis.com/youtube/v3/channels';
const YT_API_SEARCH = 'https://www.googleapis.com/youtube/v3/search';
const YT_API_VIDEOS = 'https://www.googleapis.com/youtube/v3/videos';
const YT_API_KEY = 'AIzaSyDe2NF-3q_aCIi1TIW0bIN44OqHQAPEc5w';

// LFM = Last FM
const LFM_API = 'http://ws.audioscrobbler.com/2.0/';
const LFM_API_KEY = '545cfc729a150144d0834bf15b273835';

const SEARCH_MAX_RESULTS = 50;

const channelAddressSubmit = document.getElementById('channel-address-submit');
const addChannelAddressInputButton = document.getElementById('add-channel-address-input');
const removeAllChannelAddressInputsButton = document.getElementById('remove-all-channel-address-inputs');
const musicTable = document.getElementById('music-table');
const resultsFoundMessage = document.getElementById('results-found-message');
const searchStatus = document.getElementById('search-status');
const errorDialog = document.getElementById('error-dialog');
const closeErrorDialogButton = document.getElementById('close-error-dialog-button');
const errorDialogMessage = document.getElementById('error-dialog-message');
const artistDialog = document.getElementById('artist-dialog');
const artistImage = document.getElementById('artist-image');
const closeArtistDialogButton = document.getElementById('close-artist-dialog-button');
let tableData = [];
let channelAddressData = [];

let resultsFound = 0;
let unsuccessfullyParsed = 0;
let inputId = 0;

class ApplicationError extends Error {}
class PeerError extends Error {}
class UserError extends Error {}

function assertPeer (assertion, errorMessage) {
  if (!assertion) {
    throw new PeerError(errorMessage);
  }
}

function assertApp (assertion, errorMessage) {
  if (!assertion) {
    throw new ApplicationError(errorMessage);
  }
}

function assertUser (assertion, errorMessage) {
  if (!assertion) {
    throw new UserError(errorMessage);
  }
}

function warning (msg) {
  if (DEBUG_MODE) {
    console.log(msg);
  }
}

function handleError (e) {
  console.log(e);

  fixAppState();

  if (e instanceof UserError) {
    errorDialogMessage.innerHTML = e.message;
  } else {
    errorDialogMessage.innerHTML = 'An unexpected error has occurred.';

    if (DEBUG_MODE) {
      console.error(e.message);
    }
  }

  errorDialog.showModal();
}

function fixAppState () {
  if (searchStatus instanceof window.HTMLParagraphElement) {
    searchStatus.style.visibility = 'hidden';
  }
  if (channelAddressSubmit instanceof window.HTMLButtonElement) {
    channelAddressSubmit.disabled = false;
    removeAllChannelAddressInputsButton.disabled = false;
    addChannelAddressInputButton.disabled = false;
  }
}

function closeErrorDialog () {
  errorDialog.close();
}

function closeArtistDialog () {
  artistImage.src = '';
  artistDialog.close();
}

async function showArtistDialog (e) {
  e.preventDefault(); // to not open link, when clicked, as new page

  assertApp(artistImage instanceof window.HTMLImageElement, 'Element artistImage not found.');
  assertApp(artistDialog instanceof window.HTMLDialogElement, 'Element artistDialog not found.');
  assertApp(typeof e.target.innerHTML === 'string', `Expected typeof e.target.innerHTML to be string, but got ${typeof e.target.innerHTML}`);

  artistImage.src = await getArtistImage(e.target.innerHTML);
  artistDialog.showModal();
}

function channelAddressSubmitOnClick () {
  const channelAddressInputs = document.getElementsByClassName('channel-address-input');

  clearTable();
  channelAddressData = [];
  // TODO escape input

  assertApp(channelAddressInputs.length > 0, 'Element channelAddressInputs not found.');
  assertApp(resultsFoundMessage instanceof window.HTMLParagraphElement, 'Element resultsFoundMessage not found.');
  assertApp(channelAddressSubmit instanceof window.HTMLButtonElement, 'Element channelAddressSubmit not found.');

  searchStatus.style.visibility = 'visible';
  searchStatus.innerHTML = 'Searching...';

  channelAddressSubmit.disabled = true;
  removeAllChannelAddressInputsButton.disabled = true;
  addChannelAddressInputButton.disabled = true;

  const promises = Array.from(channelAddressInputs).map((channelAddressInput) => {
    let getUntilLast, inputId;

    assertApp(channelAddressInput instanceof window.HTMLInputElement, `Element channelAddressInput not an input.`);

    inputId = getInputId(channelAddressInput.className);

    getUntilLast = generateGetUntilLast(inputId);
    channelAddressData.push({
      channelAddress: channelAddressInput.value,
      getUntilLast: getUntilLast,
      id: inputId
    });

    return identifyChannel(channelAddressInput.value)
      .then((channelId) => getChannelVideos(channelId, getUntilLast));
  });

  Promise.all(promises).then(() => {
    searchStatus.style.visibility = 'visible';
    searchStatus.innerHTML = 'Finished';
    channelAddressSubmit.disabled = false;
    removeAllChannelAddressInputsButton.disabled = false;
    addChannelAddressInputButton.disabled = false;

    if (musicTable.style.visibility === 'hidden') { // if no results
      resultsFoundMessage.style.visibility = 'visible';
      resultsFoundMessage.innerHTML = 'No results';
    }

    saveStateToLocalStorage();
  });
}

function getInputId (className) {
  const inputIdPattern = /input-\d+/g;
  const inputIdMatches = className.match(inputIdPattern);

  assertApp(
    inputIdMatches instanceof Array &&
    inputIdMatches.length === 1,
    `Unexpected className ${className}. Expected to be "input-[*integer*]."`
  );

  return inputIdMatches[0].replace('input-', '').trim();
}

async function identifyChannel (channelAddress) {
  assertApp(typeof channelAddress === 'string', `Expected typeof channelAddress to be string, but got ${typeof channelAddress}`);

  let channelId;
  let identificator = getChannelIdentificator(channelAddress);

  if (identificator.type === 'username') {
    channelId = await getChannelId(identificator.value);
  } else if (identificator.type === 'channelId') {
    channelId = identificator.value;
  } else {
    throw new UserError(`Sorry, "${channelAddress}" could not be recognised as a youtube channel address.`);
  }

  return channelId;
}

function generateGetUntilLast (inputId) {
  const getUntilLastElements = document.getElementsByClassName(`get-until-last-${inputId}`);
  let getUntilLast;

  assertApp(getUntilLastElements.length > 0, 'Element getUntilLastElements not found.');

  for (let i = 0; i < getUntilLastElements.length; i++) {
    if (getUntilLastElements[i].checked) {
      getUntilLast = getUntilLastElements[i].value;
      break;
    }
  }

  assertUser(getUntilLast, 'Please select an option from "Get until last".');
  return getUntilLast;
}

function addChannelAddressInput (input) {
  const channelAddressInputs = document.getElementById('channel-address-inputs');
  const inputBlock = document.createElement('div');
  const channelAddressCol = document.createElement('div');
  const getUntilLastCol = document.createElement('div');
  const inputChannel = document.createElement('input');
  const removeChannelBtn = document.createElement('button');
  const removeChannelBtnSpan = document.createElement('span');
  const getUntilLastOptions = ['week', 'month', 'year'];
  let getUntilLast;

  assertApp(channelAddressInputs, 'Element channelAddressInputs not found.');

  inputBlock.className = `row input-${inputId.toString()}`;
  channelAddressCol.className = `col-md-12 col-xs-12 input-group input-${inputId.toString()}`;
  getUntilLastCol.className = `col-md-3 col-xs-3 input-${inputId.toString()}`;

  inputChannel.type = 'text';
  inputChannel.className = `channel-address-input form-control input-${inputId.toString()}`;
  inputChannel.placeholder = 'Link to channel';
  inputChannel.value = (isObject(input) && typeof input.channelAddress === 'string') ? input.channelAddress : '';

  removeChannelBtnSpan.className = 'input-group-btn';
  removeChannelBtn.className = `btn btn-danger input-${inputId.toString()}`;
  removeChannelBtn.innerHTML = 'X';
  removeChannelBtn.onclick = removeChannelAddressInput;

  removeChannelBtnSpan.appendChild(removeChannelBtn);
  channelAddressCol.appendChild(inputChannel);
  channelAddressCol.appendChild(removeChannelBtnSpan);

  for (let getUntilLastOption of getUntilLastOptions) {
    const label = document.createElement('label');
    const radioInput = document.createElement('input');

    radioInput.type = 'radio';
    radioInput.name = `get-until-last-${inputId}`;
    radioInput.className = `get-until-last-${inputId}`;
    radioInput.value = getUntilLastOption;

    if (
      isObject(input) &&
      typeof input.getUntilLast === 'string' &&
      getUntilLastOption === input.getUntilLast
    ) {
      radioInput.checked = 'checked';
      getUntilLast = input.getUntilLast;
    } else if (getUntilLastOption === 'week') {
      radioInput.checked = 'checked';
      getUntilLast = 'week';
    }

    label.appendChild(radioInput);
    label.appendChild(document.createTextNode(getUntilLastOption));
    getUntilLastCol.appendChild(label);
  }
  inputBlock.appendChild(channelAddressCol);
  inputBlock.appendChild(getUntilLastCol);
  channelAddressInputs.appendChild(inputBlock);

  channelAddressData.push({
    channelAddress: inputChannel.value,
    getUntilLast: getUntilLast,
    id: inputId
  });

  inputId++;
}

function removeChannelAddressInput (event) {
  assertApp(
    event instanceof window.Event &&
    event.target instanceof window.HTMLButtonElement &&
    typeof event.target.className === 'string',
    'Invalid event.'
  );

  let inputId = getInputId(event.target.className);
  const elements = document.getElementsByClassName(`row input-${inputId}`);

  assertApp(
    elements instanceof window.HTMLCollection &&
    elements.length === 1 &&
    elements[0] instanceof window.HTMLDivElement,
    'Element channel address input not found or too many instances.'
  );

  assertApp(
    channelAddressData instanceof Array,
    'Channel address data not found'
  );

  let channelAddressRow = elements[0];
  channelAddressRow.remove();
  channelAddressData = channelAddressData.filter(data => {
    assertApp(
      isObject(data) &&
      typeof Number(data.id) === 'number',
      'Invalid channel address data.'
    );

    return Number(data.id) !== Number(inputId);
  });

  if (channelAddressData.length <= 0) {
    addChannelAddressInput();
  }

  saveStateToLocalStorage();
}

function clearChannelAddressInputs () {
  const channelAddressInputs = document.getElementById('channel-address-inputs');

  clearTable();

  assertApp(channelAddressInputs, 'Element channelAddressInputs not found.');
  assertApp(searchStatus instanceof window.HTMLParagraphElement, 'Element searchStatus not found.');

  searchStatus.style.visibility = 'hidden';

  while (channelAddressInputs.firstChild) {
    channelAddressInputs.removeChild(channelAddressInputs.firstChild);
  }

  channelAddressData = [];
}

function deleteAllTableRows () {
  let tableHeaderRowCount = 1;

  for (let i = musicTable.rows.length - 1; i >= tableHeaderRowCount; i--) {
    musicTable.deleteRow(i);
  }
}

function clearTable () {
  resultsFound = 0;
  unsuccessfullyParsed = 0;
  tableData = [];

  assertApp(musicTable instanceof window.HTMLTableElement, 'Element musicTable not found.');
  assertApp(resultsFoundMessage instanceof window.HTMLParagraphElement, 'Element resultsFoundMessage not found.');

  musicTable.style.visibility = 'hidden';
  resultsFoundMessage.style.visibility = 'hidden';

  deleteAllTableRows();
}

function saveStateToLocalStorage () {
  const state = {};
  let stateStringified;

  assertApp(channelAddressData instanceof Array, '"channelAddressData" not an array.');

  for (let i = 0; i < channelAddressData.length; i++) {
    assertApp(
      isObject(channelAddressData[i]) &&
      typeof channelAddressData[i].channelAddress === 'string' &&
      typeof channelAddressData[i].getUntilLast === 'string',
      'Invalid channelAddressData.'
    );
  }

  state.tableData = tableData;
  state.channelAddressData = channelAddressData;
  state.resultsFound = resultsFound;
  state.unsuccessfullyParsed = unsuccessfullyParsed;

  try {
    stateStringified = JSON.stringify(state);
    window.localStorage.setItem('musicbox', stateStringified);
  } catch (e) {
    throw new ApplicationError('Failed to save app state');
  }
}

function restoreStateFromLocalStorage () {
  let state;

  try {
    let stateStringified = window.localStorage.getItem('musicbox');

    if (!stateStringified) {
      addChannelAddressInput();
      return;
    }
    state = JSON.parse(stateStringified);
  } catch (e) {
    throw new ApplicationError('Failed to restore app state');
  }

  clearChannelAddressInputs();

  if (!state) {
    addChannelAddressInput();
    return;
  }

  assertApp(resultsFoundMessage instanceof window.HTMLParagraphElement, 'Element resultsFoundMessage, instance of HTMLParagraphElement, not found.');

  if (state.channelAddressData) {
    for (const data of state.channelAddressData) {
      addChannelAddressInput(data);
    }
  }

  if (state.tableData && state.tableData instanceof Array && state.tableData.length > 0) {
    tableData = state.tableData;
    updateTable();
  }

  if (state.resultsFound) {
    resultsFoundMessage.innerHTML = `${state.resultsFound} results found.`;

    if (state.unsuccessfullyParsed && state.unsuccessfullyParsed > 0) {
      resultsFoundMessage.innerHTML += ` ${state.unsuccessfullyParsed} were not songs.`;
    }
  }
}

function getChannelIdentificator (channelAddress) {
  // identificator can be channel id or username
  const channelRoutePattern = /\/channel\/[^/\s]+/; // matches '/channel/channelId' in 'https://www.youtube.com/channel/channelId'
  const usernameRoutePattern = /\/user\/[^/\s]+/; // matches '/user/username' in 'https://www.youtube.com/user/username'
  const usernameShortRoutePattern = /.com\/[^/\s]+/; // matches '.com/username' in 'https://www.youtube.com/username'
  let identificator;

  if (channelAddress.match(channelRoutePattern)) {
    const channelIdMatches = channelAddress.match(channelRoutePattern);

    if (channelIdMatches.length !== 1) {
      warning(`Expected 1 match for channelRoutePattern but got ${channelIdMatches.length}.`);
    }

    const channelIdMatch = channelIdMatches[0];
    const result = channelIdMatch.replace('/channel/', '').trim();

    identificator = {
      type: 'channelId',
      value: result
    };
  } else if (channelAddress.match(usernameRoutePattern)) {
    const usernameMatches = channelAddress.match(usernameRoutePattern);

    if (usernameMatches.length !== 1) {
      warning(`Expected 1 match for usernameRoutePattern but got ${usernameMatches.length}.`);
    }

    const usernameMatch = usernameMatches[0];
    const result = usernameMatch.replace('/user/', '').trim();

    identificator = {
      type: 'username',
      value: result
    };
  } else if (channelAddress.match(usernameShortRoutePattern)) {
    const usernameMatches = channelAddress.match(usernameShortRoutePattern);

    if (usernameMatches.length !== 1) {
      warning(`Expected 1 match for usernameShortRoutePattern but got ${usernameMatches.length}.`);
    }

    const usernameMatch = usernameMatches[0];
    const result = usernameMatch.replace('.com/', '').trim();

    identificator = {
      type: 'username',
      value: result
    };
  } else {
    throw new UserError(`Sorry, "${channelAddress}" could not be recognised as a youtube channel address.`);
  }

  if (!identificator.value) {
    throw new UserError(`Sorry, "${channelAddress}" could not be recognised as a youtube channel address.`);
  }

  return identificator;
}

function durationToString (duration) {
  let string = '';

  if (duration.hours !== null) {
    if (duration.hours < 10) {
      string += '0';
    }

    string += `${duration.hours}:`;
  }

  if (duration.minutes !== null) {
    if (duration.minutes < 10) {
      string += '0';
    }
    string += `${duration.minutes}:`;
  } else {
    string += '00:';
  }

  if (duration.seconds !== null) {
    if (duration.seconds < 10) {
      string += '0';
    }
    string += `${duration.seconds}`;
  } else {
    string += '00';
  }

  return string;
}

function parseDuration (duration) {
  const secondsPattern = /\d+(?=S)/;
  const minutesPattern = /\d+(?=M)/;
  const hoursPattern = /\d+(?=H)/;

  const secondsMatches = duration.match(secondsPattern);
  const minutesMatches = duration.match(minutesPattern);
  const hoursMatches = duration.match(hoursPattern);

  assertPeer(
    secondsMatches === null ||
    secondsMatches.length === 1,
    `Expected 1 match for seconds but got ${(secondsMatches instanceof Array) ? secondsMatches.length : secondsMatches}.`
  );

  assertPeer(
    minutesMatches === null ||
    minutesMatches.length === 1,
    `Expected 1 match for minutes or null but got ${(minutesMatches instanceof Array) ? minutesMatches.length : minutesMatches}.`
  );

  assertPeer(
    hoursMatches === null ||
    hoursMatches.length === 1,
    `Expected 1 match for hours but got ${(hoursMatches instanceof Array) ? hoursMatches.length : hoursMatches}.`
  );

  return {
    seconds: (secondsMatches === null) ? null : secondsMatches[0],
    minutes: (minutesMatches === null) ? null : minutesMatches[0],
    hours: (hoursMatches === null) ? null : hoursMatches[0]
  };
}

async function getChannelId (username) {
  const channelResponse = await getJSONResponse(YT_API_CHANNELS, {
    key: YT_API_KEY,
    forUsername: username,
    part: 'id'
  });

  assertPeer(
    channelResponse !== null &&
    channelResponse.items instanceof Array &&
    channelResponse.items.length > 0 &&
    typeof channelResponse.items[0].id === 'string',
    'Youtube could not provide channel data.'
  );

  if (channelResponse.items.length !== 1) {
    warning(`Expected 1 for channelResponse.items.length but got ${channelResponse.items.length}.`);
  }

  return channelResponse.items[0].id;
}

async function getChannelVideos (channelId, getUntilLast, pageToken) {
  const date = new Date();

  if (getUntilLast === 'week') {
    date.setDate(date.getDate() - 7);
  } else if (getUntilLast === 'month') {
    date.setMonth(date.getMonth() - 1);
  } else if (getUntilLast === 'year') {
    date.setFullYear(date.getFullYear() - 1);
  } else {
    throw new ApplicationError(`Invalid value for "getUntilLast" - expected "week", "month" or "year", but got "${getUntilLast}".`);
  }

  const searchVideosResponse = await getJSONResponse(YT_API_SEARCH, {
    key: YT_API_KEY,
    channelId: channelId,
    type: 'video',
    part: 'id',
    order: 'date',
    maxResults: SEARCH_MAX_RESULTS,
    pageToken: pageToken || '',
    publishedAfter: date.toISOString()
  });

  assertPeer(
    isObject(searchVideosResponse) &&
    searchVideosResponse.items instanceof Array,
    'Youtube could not provide videos.'
  );

  const promises = searchVideosResponse.items.map(generateItemData);

  if (searchVideosResponse.nextPageToken) {
    promises.push(getChannelVideos(channelId, getUntilLast, searchVideosResponse.nextPageToken));
  }

  await Promise.all(promises);
}

async function generateItemData (item) {
  resultsFound++;

  assertPeer(
    isObject(item) &&
    isObject(item.id) &&
    typeof item.id.videoId === 'string',
    'Youtube could not provide video data.'
  );

  const musicVideoData = await getMusicVideoData(item.id.videoId);

  if (Object.keys(musicVideoData).length === 0) {
    unsuccessfullyParsed++;
  } else {
    const artistNamesSeparated = separateArtists(musicVideoData.artist);
    const rowData = {
      artists: artistNamesSeparated,
      songTitle: musicVideoData.songTitle,
      album: await getAlbum(musicVideoData),
      duration: musicVideoData.duration,
      publishedAt: new Date(musicVideoData.publishedAt).toDateString(),
      channel: musicVideoData.channel,
      title: musicVideoData.title
    };

    tableData.push(rowData);
    updateTable();
  }
}

function sortTableDataDescByDate () {
  tableData.sort((a, b) => {
    let dateA = new Date(a.publishedAt);
    let dateB = new Date(b.publishedAt);

    if (dateA > dateB) {
      return -1;
    } else if (dateA < dateB) {
      return 1;
    } else {
      return 0;
    }
  });
}

function updateTable () {
  assertApp(musicTable instanceof window.HTMLTableElement, 'Element musicTable not found.');
  assertApp(tableData instanceof Array, 'Table data not found');

  musicTable.style.visibility = 'visible';
  resultsFoundMessage.style.visibility = 'visible';
  resultsFoundMessage.innerHTML = `${resultsFound} results found.`;

  if (unsuccessfullyParsed > 0) {
    resultsFoundMessage.innerHTML += ` ${unsuccessfullyParsed} were not songs.`;
  }

  deleteAllTableRows();
  sortTableDataDescByDate();

  for (let data of tableData) {
    let newRow = musicTable.insertRow(musicTable.rows.length);
    let artistCell = newRow.insertCell(0);
    let songCell = newRow.insertCell(1);
    let albumCell = newRow.insertCell(2);
    let durationCell = newRow.insertCell(3);
    let releasedCell = newRow.insertCell(4);
    let channelCell = newRow.insertCell(5);

    newRow.title = data.title;

    artistCell.innerHTML = generateArtistCellInnerHTML(data.artists);
    songCell.innerHTML = data.songTitle;
    albumCell.innerHTML = data.album;
    durationCell.innerHTML = durationToString(data.duration);
    releasedCell.innerHTML = data.publishedAt;
    channelCell.innerHTML = data.channel;
  }
  const artistPopUps = document.getElementsByClassName('artist-pop-up');

  assertApp(artistPopUps instanceof window.HTMLCollection, 'Element artistPopUps not found.');

  for (let i = 0; i < artistPopUps.length; i++) {
    const artistPopUp = artistPopUps[i];

    assertApp(artistPopUp instanceof window.HTMLAnchorElement, 'Element artistPopUp, instance of HTMLAnchorElement, not found.');

    artistPopUp.onclick = showArtistDialog;
  }
}

function generateArtistCellInnerHTML (artistNames) {
  let artistCellInnerHTML = [];

  for (let k = 0; k < artistNames.length; k++) {
    const artistName = artistNames[k];

    const artistPopUp = document.createElement('a');
    artistPopUp.innerHTML = artistName;
    artistPopUp.href = '';
    artistPopUp.setAttribute('class', 'artist-pop-up');

    if (k !== 0 && k !== artistNames.length - 1) {
      artistCellInnerHTML += ', ';
    } else if (k !== 0 && k === artistNames.length - 1) {
      artistCellInnerHTML += ' & ';
    }
    artistCellInnerHTML += artistPopUp.outerHTML;
  }

  return artistCellInnerHTML;
}

function toQueryString (params) {
  const paramsList = [];

  for (const [param, val] of Object.entries(params)) {
    paramsList.push([encodeURIComponent(param), encodeURIComponent(val)]);
  }

  return paramsList.map(pair => pair.join('='))
    .join('&');
}

async function getResponse (url, queryParams) {
  return window.fetch(`${url}?${toQueryString(queryParams)}`);
}

async function getJSONResponse (url, queryParams) {
  const response = await getResponse(url, queryParams);
  return response.json();
}

async function getMusicVideoData (videoId) {
  const artistPattern = /^.+(?= - )/; // matches 'Artist Name' in 'Artist Name - Song name (remix)'
  const titlePattern = / - [^()[\]]+/; // matches ' - Song name ' in 'Artist Name - Song name (remix)'
  let video;

  const videoData = await getJSONResponse(YT_API_VIDEOS, {
    key: YT_API_KEY,
    part: 'contentDetails,snippet',
    id: videoId
  });

  assertPeer(
    isObject(videoData) &&
    videoData.items instanceof Array &&
    videoData.items.length > 0,
    'Youtube could not provide video data.'
  );

  if (videoData.items.length !== 1) {
    warning(`Expected 1 for videoData items but got ${videoData.items.length}.`);
  }

  video = videoData.items[0];

  assertPeer(
    isObject(video) &&
    isObject(video.snippet) &&
    typeof video.snippet.title === 'string' &&
    typeof video.snippet.publishedAt === 'string' &&
    typeof video.snippet.channelTitle === 'string' &&
    isObject(video.contentDetails) &&
    typeof video.contentDetails.duration === 'string',
    'Youtube could not provide video data.'
  );

  const videoTitle = video.snippet.title;
  const artistMatches = videoTitle.match(artistPattern);
  const songTitleMatches = videoTitle.match(titlePattern);
  const duration = parseDuration(video.contentDetails.duration);

  if (
    artistMatches === null ||
    songTitleMatches === null ||
    duration === null
  ) {
    return {};
  }

  if (artistMatches.length !== 1) {
    warning(`Expected 1 match for artist matches but got ${artistMatches.length}.`);
  }

  if (songTitleMatches.length !== 1) {
    warning(`Expected 1 match for song title matches but got ${songTitleMatches.length}.`);
  }

  const artist = artistMatches[0].trim();
  const songTitle = songTitleMatches[0].replace(' - ', '').trim();
  const publishedAt = video.snippet.publishedAt;
  const channel = video.snippet.channelTitle;
  const title = video.snippet.title;

  return {
    artist,
    songTitle,
    duration,
    publishedAt,
    channel,
    title
  };
}

function separateArtists (artistsString) {
  const artistPattern = /[\w\s]+/g;

  return artistsString.match(artistPattern)
    .map(artist => artist.trim());
}

async function getAlbum (musicVideoData) {
  assertApp(
    isObject(musicVideoData) &&
    typeof musicVideoData.artist === 'string' &&
    typeof musicVideoData.songTitle === 'string',
    'Invalid function argument object format.'
  );

  const albumData = await getJSONResponse(LFM_API, {
    method: 'track.getInfo',
    api_key: LFM_API_KEY,
    artist: musicVideoData.artist,
    track: musicVideoData.songTitle,
    format: 'json'
  });

  if (
    !isObject(albumData) ||
    !isObject(albumData.track) ||
    !isObject(albumData.track.album) ||
    typeof albumData.track.album.title !== 'string'
  ) {
    return 'LAST.FM could not provide album data.';
  }

  return albumData.track.album.title;
}

async function getArtistImage (artist) {
  const artistData = await getJSONResponse(LFM_API, {
    method: 'artist.getInfo',
    api_key: LFM_API_KEY,
    artist: artist,
    format: 'json'
  });

  assertPeer(
    isObject(artistData) &&
    isObject(artistData.artist) &&
    artistData.artist.image instanceof Array &&
    artistData.artist.image.length > 0 &&
    isObject(artistData.artist.image[artistData.artist.image.length - 1]) &&
    typeof artistData.artist.image[artistData.artist.image.length - 1]['#text'] === 'string',
    'LAST.FM could not provide artist data.'
  );

  const image = artistData.artist.image[artistData.artist.image.length - 1]['#text'];

  return image;
}

function isObject (value) {
  return value !== null && typeof value === 'object';
}

channelAddressSubmit.onclick = async () => {
  try {
    await channelAddressSubmitOnClick();
  } catch (error) {
    handleError(error);
  }
};
addChannelAddressInputButton.onclick = () => addChannelAddressInput();
removeAllChannelAddressInputsButton.onclick = () => {
  clearChannelAddressInputs();
  addChannelAddressInput();
  saveStateToLocalStorage();
};
closeErrorDialogButton.onclick = closeErrorDialog;
closeArtistDialogButton.onclick = closeArtistDialog;

musicTable.style.visibility = 'hidden';
resultsFoundMessage.style.visibility = 'hidden';
searchStatus.style.visibility = 'hidden';
restoreStateFromLocalStorage();

// window.onunhandledrejection = (event) => {
//   console.log('test');
// }

window.addEventListener('error', (event) => {
  console.log('error');
  // handleError(error)
});
window.addEventListener('unhandledrejection', (event) => {
  console.log('unhandledrejection');
  // handleError(error);
});

window.addEventListener('rejectionhandled', (event) => {
  console.log('rejectionhandled');
  // handleError(error);
});
