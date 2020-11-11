(function blogBackground() {
	const BLOG_LAST_VISIT = 'blogLastVisit';
	const BLOG_LAST_CHECK = 'blogLastCheck';
	const BLOG_RSS_URL = 'https://www.shiwaforce.com/blog/feed/';
	const CAREER_LAST_VISIT = 'careerLastVisit';
	const CAREER_LAST_CHECK = 'careerLastCheck';
	const CAREER_REST_URL = 'https://www.shiwaforce.com/wp-json/jobs/count';
	const SCHEDULED_CHECKER_PERIOD_MS = 10 * 60 * 1000;
	const A_HOUR_IN_MS = 60 * 60 * 1000;

	function getBlogFeed() {
		return new Promise((resolve, reject) => {
			ajaxGet(BLOG_RSS_URL, (responseText, responseXML) => {
				if (!responseXML) {
					reject();
				} else {
					resolve(responseXML);
				}
			});
		});
	}

	function getCareerFeed() {
		return new Promise((resolve, reject) => {
			ajaxGet(CAREER_REST_URL, responseText => {
				try {
					let responseJson = JSON.parse(responseText);
					resolve(responseJson);
				} catch (e) {
					console.error('cannot parse career rest response', e);
					reject('cannot parse rest');
				}
			});
		});
	}

	let schedulingTimeout = 0;
	let hasNewBlogEntry = false;
	let hasNewCareerEntry = false;

	function scheduledChecker() {
		clearTimeout(schedulingTimeout);
		let now = Date.now();
		chrome.storage.local.get([BLOG_LAST_CHECK], result => {
			let isNeverChecked = !result[BLOG_LAST_CHECK];
			let isTooOldCheck = !isNeverChecked && result[BLOG_LAST_CHECK] + A_HOUR_IN_MS < now;
			if (isNeverChecked || isTooOldCheck) {
				getBlogFeed().then(rss => {
					let items = Array.from(rss.querySelectorAll('channel > item'));
					let newestTimestamp = 0;
					items.forEach(item => {
						let dateString = item.querySelector('pubDate').textContent;
						let timestamp = Date.parse(dateString);
						if (timestamp > newestTimestamp) {
							newestTimestamp = timestamp;
						}
					});
					chrome.storage.local.set({[BLOG_LAST_CHECK]: now});
					chrome.storage.sync.get([BLOG_LAST_VISIT], result => {
						let isNeverChecked = !result[BLOG_LAST_VISIT];
						let isTooOldCheck = !isNeverChecked && result[BLOG_LAST_VISIT] < newestTimestamp;
						if (isNeverChecked || isTooOldCheck) {
							hasNewBlogEntry = true;
							chrome.runtime.sendMessage({action: 'blogNewEntryFound', data: {}});
						}
					});
				});
			}
		});
		chrome.storage.local.get([CAREER_LAST_CHECK], result => {
			let isNeverChecked = !result[CAREER_LAST_CHECK];
			let isTooOldCheck = !isNeverChecked && result[CAREER_LAST_CHECK] + A_HOUR_IN_MS < now;
			if (isNeverChecked || isTooOldCheck) {
				getCareerFeed().then(careerResult => {
					chrome.storage.local.set({[CAREER_LAST_CHECK]: now});
					chrome.storage.sync.get([CAREER_LAST_VISIT], result => {
						let isNeverChecked = !result[CAREER_LAST_VISIT];
						let isTooOldCheck = !isNeverChecked && result[CAREER_LAST_VISIT] < careerResult.latest;
						if (isNeverChecked || isTooOldCheck) {
							hasNewCareerEntry = true;
							chrome.runtime.sendMessage({action: 'careerNewEntryFound', data: {}});
						}
					});
				});
			}
		});
		schedulingTimeout = setTimeout(scheduledChecker, SCHEDULED_CHECKER_PERIOD_MS);
	}

	function onBlogClearData(message) {
		hasNewBlogEntry = false;
		chrome.storage.local.remove([BLOG_LAST_CHECK]);
		chrome.storage.sync.remove([BLOG_LAST_VISIT]);
		scheduledChecker();
	}

	function onCareerClearData(message) {
		hasNewCareerEntry = false;
		chrome.storage.local.remove([CAREER_LAST_CHECK]);
		chrome.storage.sync.remove([CAREER_LAST_VISIT]);
		scheduledChecker();
	}

	function onBlogOpen(message) {
		hasNewBlogEntry = false;
		chrome.storage.sync.set({[BLOG_LAST_VISIT]: Date.now()});
	}

	function onCareerOpen(message) {
		hasNewCareerEntry = false;
		chrome.storage.sync.set({[CAREER_LAST_VISIT]: Date.now()});
	}

	function onBlogGetNotifications(message) {
		if (hasNewBlogEntry) {
			chrome.runtime.sendMessage({action: 'blogNewEntryFound', data: {}});
		}
	}

	function onCareerGetNotifications(message) {
		if (hasNewCareerEntry) {
			chrome.runtime.sendMessage({action: 'careerNewEntryFound', data: {}});
		}
	}

	scheduledChecker();

	chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
		switch (message.action) {
			case 'blogClearData':
				onBlogClearData(message);
				break;
			case 'blogOpen':
				onBlogOpen(message);
				break;
			case 'blogGetNotifications':
				onBlogGetNotifications(message);
				break;
			case 'careerClearData':
				onCareerClearData(message);
				break;
			case 'careerOpen':
				onCareerOpen(message);
				break;
			case 'careerGetNotifications':
				onCareerGetNotifications(message);
				break;
			default:
				if ((message.action + '').indexOf('blog') > -1) {
					console.warn('unknown action in shiwaforce-background blog', message);
				}
		}
	});

})();
