chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	const STYLE_ID = 'statusapp-theme-from-extension';

	if (message.action == 'applyStatusappThemeCss') {
		let cssContent = message.data;
		let styleElement = document.getElementById(STYLE_ID);
		if (styleElement) {
			styleElement.parentNode.removeChild(styleElement);
		}
		if (cssContent) {
			styleElement = document.createElement('style');
			styleElement.setAttribute('id', STYLE_ID);
			styleElement.appendChild(document.createTextNode(cssContent+''));
			document.querySelector('head').appendChild(styleElement);
		}
	}
});

chrome.runtime.sendMessage({action: 'statusappLoaded'});
