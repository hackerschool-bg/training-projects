const gallery = document.getElementById('gallery');
let sidebarShowed = true;

document.getElementById('add-button').addEventListener('click', () => {
  const li = document.createElement('li');
  const img = document.createElement('img');
  img.setAttribute('src', 'hell.gif');
  li.appendChild(img);
  gallery.appendChild(li);
});

document.getElementById('remove-button').addEventListener('click', () => {
  const child = gallery.children[1]; // skip #all-the-css child

  if (child == null) {
    return;
  }

  gallery.removeChild(child);
});

document.getElementById('menu-button').addEventListener('click', () => {
  if (sidebarShowed) {
    document.getElementById('sidebar').classList.add('hide-sidebar');
    document.getElementById('main-content').classList.add('fill-sidebar');
    sidebarShowed = false;
  } else {
    document.getElementById('sidebar').classList.remove('hide-sidebar');
    document.getElementById('main-content').classList.remove('fill-sidebar');
    sidebarShowed = true;
  }
});
