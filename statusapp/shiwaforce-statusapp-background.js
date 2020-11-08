(function statusappBackground() {
	const STATUSAPP_SELECTED_THEME_KEY = 'statusappSelectedCustomTheme';
	const STATUSAPP_THEME_URL_PREFIX = 'https://raw.githubusercontent.com/shiwaforce/statusapp-custom-themes/master/';
	const STATUSAPP_THEMES_URL = STATUSAPP_THEME_URL_PREFIX + 'themes.json';
	const STATUSAPP_TABS_URL_PATTERN = 'https://go.statusapp.online/*';


	let getStatusappThemesInProgress = false;
	let statusappThemes = null;

	function getStatusappThemes(force = false, timeout = 100) {
		if (timeout <= 0) {
			return new Promise((resolve, reject) => {
				console.error('cannot get statusapp themes, timeout...');
				reject('timeout');
			});
		}
		if (getStatusappThemesInProgress) {
			setTimeout(getStatusappThemes, 100, force, timeout - 1);
		}
		if (statusappThemes && !force) {
			return new Promise(resolve => {
				resolve(statusappThemes);
			});
		}
		getStatusappThemesInProgress = true;
		return new Promise(function (resolve, reject) {
			ajaxGet(STATUSAPP_THEMES_URL, responseText => {
				getStatusappThemesInProgress = false;
				if (responseText) {
					try {
						let parsedThemes = JSON.parse(responseText);
						parsedThemes.unshift({name: 'Alapértelmezett'});
						statusappThemes = parsedThemes;
						resolve(statusappThemes);
					} catch (e) {
						reject('there is no json received', e);
					}
				} else {
					reject('no response for themes');
				}
			});
		});
	}

	let cssFiles = {};

	function getStatusappThemeCssContent(filename, force = false) {
		return new Promise(function (resolve, reject) {
			if (cssFiles[filename] && !force) {
				resolve(cssFiles[filename]);
			} else {
				if (filename) {
					ajaxGet(STATUSAPP_THEME_URL_PREFIX + filename, responseText => {
						if (responseText) {
							cssFiles[filename] = responseText;
							resolve(responseText);
						} else {
							reject('no response for theme ' + filename);
						}
					});
				} else {
					resolve(null);
				}
			}
		});
	}

	function getStatusappSelectedTheme() {
		return new Promise(resolve => {
			chrome.storage.sync.get(STATUSAPP_SELECTED_THEME_KEY, result => {
				let selectedThemeId = result[STATUSAPP_SELECTED_THEME_KEY];
				if (selectedThemeId) {
					resolve(selectedThemeId);
				} else {
					resolve(null);
				}
			});
		});
	}


	function sendStatusappThemeCssContent(cssContent, all = false) {
		let queryObject;
		if (all) {
			queryObject = {url: STATUSAPP_TABS_URL_PATTERN};
		} else {
			queryObject = {active: true, currentWindow: true};
		}
		chrome.tabs.query(queryObject, function (tabs) {
			tabs.forEach(tab => {
				chrome.tabs.sendMessage(tab.id, {action: 'applyStatusappThemeCss', data: cssContent});
			})
		});
	}

	function onStatusappLoaded(message) {
		getStatusappSelectedTheme().then(selectedFilename => {
			if (selectedFilename) {
				getStatusappThemeCssContent(selectedFilename).then(sendStatusappThemeCssContent);
			} else {
				sendStatusappThemeCssContent(null);
			}
		});
	}

	function onStatusappSaveSelectedThemeFilename(message) {
		let selectedThemeFilename = message?.data?.selectedThemeFilename;
		chrome.storage.sync.set({[STATUSAPP_SELECTED_THEME_KEY]: selectedThemeFilename});
		if (selectedThemeFilename) {
			getStatusappThemeCssContent(selectedThemeFilename).then(cssContent => sendStatusappThemeCssContent(cssContent, true));
		} else {
			sendStatusappThemeCssContent(null, true);
		}
	}

	function onStatusappGetData(message) {
		if (message.data.force) {
			cssFiles = {};
		}
		getStatusappThemes(message.data.force).then(statusappThemes => {
			getStatusappSelectedTheme().then(selectedFilename => {
				chrome.runtime.sendMessage({
					action: 'receivedStatusappData',
					data: {themes: statusappThemes, selectedFilename}
				});
			});
		});
	}

	function onStatusappClearData(message) {
		// clear local cache
		cssFiles = {};
		statusappThemes = null;
		// clear stored settings
		chrome.storage.sync.remove([STATUSAPP_SELECTED_THEME_KEY]);
		onStatusappGetData({data: {force: true}});
		onStatusappSaveSelectedThemeFilename(null);
	}

	chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
		switch (message.action) {
			case "statusappLoaded":
				onStatusappLoaded(message);
				break;
			case 'statusappClearData':
				onStatusappClearData(message);
				break;
			case 'statusappGetData':
				onStatusappGetData(message);
				break;
			case 'statusappSaveSelectedThemeFilename':
				onStatusappSaveSelectedThemeFilename(message);
				break;
			default:
				if ((message.action + '').indexOf('statusapp') > -1) {
					console.warn('unknown action in shiwaforce-background statusapp', message);
				}
		}
	});
})();
