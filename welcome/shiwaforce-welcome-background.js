/**
 * a nyitó oldalhoz tartozó háttérműködés. belépésnél eltároljuk lokál táron a belépett tokent, kilépésnél töröljük
 * azért, hogy legközelebbi nyitáskor már gyorsan meglegyen, hogy be vagyunk-e lépve
 * @author sarkiroka on 2020. 11. 15.
 */
(function welcomeBackground() {
	const WELCOME_AUTH_TOKEN = 'welcomeAuthToken'

	function onWelcomeLogout() {
		chrome.storage.local.remove([WELCOME_AUTH_TOKEN]);
	}

	function onWelcomeLoginSuccess(message) {
		chrome.storage.local.set({[WELCOME_AUTH_TOKEN]: message.data.token});
	}

	function onWelcomeGetLoginState() {
		chrome.storage.local.get([WELCOME_AUTH_TOKEN], result => {
			chrome.runtime.sendMessage({action: 'welcomeLoginStateFound', data: {token: result[WELCOME_AUTH_TOKEN]}});
		});
	}

	chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
		switch (message.action) {
			case 'welcomeLogout':
				onWelcomeLogout(message);
				break;
			case 'welcomeLoginSuccess':
				onWelcomeLoginSuccess(message);
				break;
			case 'welcomeGetLoginState':
				onWelcomeGetLoginState(message);
				break;
			default:
				if ((message.action + '').indexOf('welcome') > -1) {
					console.warn('unknown action in shiwaforce-background welcome', message);
				}
		}
	});

})();
