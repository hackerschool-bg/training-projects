const contentContainer = document.getElementById('content-container');
document.getElementById('add-content-btn').addEventListener('click', (e) => contentContainer.innerHTML += '<div class="container-item"><img class="container-image" src="./images/mountain.jpeg"></div>');
document.getElementById('remove-content-btn').addEventListener('click', (e) => contentContainer.firstChild && contentContainer.removeChild(contentContainer.firstChild));
