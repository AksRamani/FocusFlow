/**
 * FocusFlow - Background Service Worker
 * Handles extension toolbar icon clicks to open the Kanban board tab
 */

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'index.html' });
});
