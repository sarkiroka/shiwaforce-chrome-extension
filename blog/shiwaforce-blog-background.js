(function blogBackground() {
	const BLOG_LAST_VISIT = 'blogLastVisit';
	const BLOG_LAST_CHECK = 'blogLastCheck';
	const BLOG_RSS_URL = 'https://www.shiwaforce.com/blog/feed/';
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

	let schedulingTimeout = 0;
	let hasNewBlogEntry = false;

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
						let isTooOldCheck = !isNeverChecked && result[BLOG_LAST_VISIT] > newestTimestamp;
						if (isNeverChecked || isTooOldCheck) {
							hasNewBlogEntry = true;
							chrome.runtime.sendMessage({action: 'blogNewEntryFound', data: {}});
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

	function onBlogOpen(message) {
		hasNewBlogEntry = false;
		chrome.storage.sync.set({[BLOG_LAST_VISIT]: Date.now()});
	}

	function onBlogGetNotifications(message) {
		if (hasNewBlogEntry) {
			chrome.runtime.sendMessage({action: 'blogNewEntryFound', data: {}});
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
			default:
				if ((message.action + '').indexOf('blog') > -1) {
					console.warn('unknown action in shiwaforce-background blog', message);
				}
		}
	});

})();
