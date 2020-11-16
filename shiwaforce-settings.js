function onReady() {
	let statusappThemes = [];
	let statusappSelectedTheme = null;
	var authToken = null;

	function hideSections() {
		Array.from(document.querySelectorAll('body > section')).forEach(section => {
			section.classList.remove('js-active');
		});
		Array.from(document.querySelectorAll('body > nav > ul > li')).forEach(navItem => {
			navItem.classList.remove('js-active');
		});
	}

	function showSection(sectionName) {
		hideSections();
		document.querySelector(`nav li.${sectionName}`)?.classList?.add('js-active');
		document.querySelector(`#${sectionName}`)?.classList?.add('js-active');
	}


	document.querySelector('nav .js-statusapp [rel="open"]').addEventListener('click', () => {
		document.querySelector('nav ul li.js-statusapp').classList.remove('js-new');
		chrome.runtime.sendMessage({action: 'statusappOpen', data: {}});
		chrome.tabs.create({url: 'https://go.statusapp.online'});
	});

	document.querySelector('nav .js-blog [rel="open"]').addEventListener('click', () => {
		document.querySelector('nav ul li.js-blog').classList.remove('js-new');
		chrome.runtime.sendMessage({action: 'blogOpen', data: {}});
		chrome.tabs.create({url: 'https://www.shiwaforce.com/blog/'});
	});

	document.querySelector('nav .js-career [rel="open"]').addEventListener('click', () => {
		document.querySelector('nav ul li.js-career').classList.remove('js-new');
		chrome.runtime.sendMessage({action: 'careerOpen', data: {}});
		chrome.tabs.create({url: 'https://www.shiwaforce.com/karrier/#openedPositions'});
	});

	document.querySelector('nav .js-statusapp [rel="settings"]').addEventListener('click', () => {
		chrome.runtime.sendMessage({action: 'statusappGetData', data: {}});
		showSection('statusapp');
	});

	document.querySelector('nav .js-blog [rel="settings"]').addEventListener('click', () => {
		showSection('blog');
	});

	document.querySelector('nav .js-career [rel="settings"]').addEventListener('click', () => {
		showSection('career');
	});

	document.querySelector('#clear-statusapp-data').addEventListener('click', () => {
		if (confirm('Tényleg minden tárolt adatot szeretnél törölni?')) {
			chrome.runtime.sendMessage({action: 'statusappClearData', data: {}});
		}
	});

	document.querySelector('#clear-blog-data').addEventListener('click', () => {
		if (confirm('Tényleg minden tárolt adatot szeretnél törölni?')) {
			chrome.runtime.sendMessage({action: 'blogClearData', data: {}});
		}
	});

	document.querySelector('#clear-career-data').addEventListener('click', () => {
		if (confirm('Tényleg minden tárolt adatot szeretnél törölni?')) {
			chrome.runtime.sendMessage({action: 'careerClearData', data: {}});
		}
	});

	document.getElementById('statusapp-color').addEventListener('change', () => {
		let selectedThemeFilename = document.getElementById('statusapp-color').value;
		chrome.runtime.sendMessage({action: 'statusappSaveSelectedThemeFilename', data: {selectedThemeFilename}});
	});

	document.querySelector('#statusapp-force-refresh').addEventListener('click', () => {
		chrome.runtime.sendMessage({action: 'statusappGetData', data: {force: true}});
	});

	function onReceivedStatusappData(request) {
		statusappThemes = request.data.themes;
		if (request.data.selectedFilename) {
			statusappSelectedTheme = statusappThemes.find(theme => theme.filename == request.data.selectedFilename);
		}
		let colorSelector = document.getElementById('statusapp-color');
		colorSelector.innerHTML = '';
		statusappThemes.forEach(theme => {
			let option = document.createElement('option');
			option.setAttribute('value', theme.filename || '');
			option.appendChild(document.createTextNode(theme.name));
			if (theme.filename == request.data.selectedFilename) {
				option.setAttribute('selected', 'selected');
			}
			colorSelector.appendChild(option);
		});
	}

	function onNewBlogEntryFound(message) {
		document.querySelector('nav ul li.js-blog').classList.add('js-new');
	}

	function onNewCareerEntryFound(message) {
		document.querySelector('nav ul li.js-career').classList.add('js-new');
	}

	function onWelcomeLoginStateFound(message) {
		if (!authToken) {
			authToken = message.data.token;
		}
		if (authToken) {
			document.getElementById('token').style.display='block';
			document.querySelector('body').classList.add('js-sf');
		} else {
			document.querySelector('body').classList.remove('js-sf');
		}
	}
	document.getElementById('token').style.display='none';

	showSection('settings');
	chrome.runtime.sendMessage({action: 'blogGetNotifications', data: {}});

	chrome.runtime.sendMessage({action: 'welcomeGetLoginState', data: {}});
	document.querySelector('#loginButton').addEventListener('click', function () {
		chrome.identity.getAuthToken({interactive: true}, function (token) {
			authToken = token;
			chrome.runtime.sendMessage({action: 'welcomeLoginSuccess', data: {token}});
			document.querySelector('body').classList.add('js-sf');
		});
	});
	document.querySelector('#clearLoginData').addEventListener('click', function () {
		if (authToken) {
			var url = 'https://accounts.google.com/o/oauth2/revoke?token=' + authToken;
			window.fetch(url);
			chrome.identity.removeCachedAuthToken({token: authToken});
			chrome.runtime.sendMessage({action: 'welcomeLogout', data: {}});
			document.querySelector('body').classList.remove('js-sf');
		}
	});

	chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
		switch (message.action) {
			case 'receivedStatusappData':
				onReceivedStatusappData(message);
				break;
			case 'blogNewEntryFound':
				onNewBlogEntryFound(message);
				break;
			case 'careerNewEntryFound':
				onNewCareerEntryFound(message);
				break;
			case 'welcomeLoginStateFound':
				onWelcomeLoginStateFound(message);
				break;
			default:
				console.warn('unknown command in popup "' + message.action + '"', message);
		}
	});

}

if (document.readyState != 'loading') {
	onReady();
} else {
	document.addEventListener('DOMContentLoaded', onReady);
}
