var options = null;

function getOptions()
{
   var changed = false;
   var tmpOpt = null;

   try
   {
      var o = localStorage['options'];
      tmpOpt = o ? JSON.parse(o) : null;
   }
   catch (e)
   {
      tmpOpt = null;
   }

   if (tmpOpt == null)
   {
      tmpOpt = {};
      changed = true;
   }

   // If any options are missing, we need to fill them in with defaults
   if (tmpOpt['jumptosinglesearchresult'] == null)
   {
      tmpOpt['jumptosinglesearchresult'] = 0;
      changed = true;
   }
   if (tmpOpt['searchresultscolumnsenable'] == null)
   {
      tmpOpt['searchresultscolumnsenable'] = 1;
      changed = true;
   }
   if (tmpOpt['prevNextSubscriptionToolbarShow'] == null)
   {
      tmpOpt['prevNextSubscriptionToolbarShow'] = '1';
      changed = true;
   }
   else
   {
      // update from old version
      if (tmpOpt['prevNextSubscriptionToolbarShow'] == 'never')
      {
         tmpOpt['prevNextSubscriptionToolbarShow'] = '0';
      }
      if (tmpOpt['prevNextSubscriptionToolbarShow'] == 'only_when_some' ||
         tmpOpt['prevNextSubscriptionToolbarShow'] == 'even_when_all_new')
      {
         tmpOpt['prevNextSubscriptionToolbarShow'] = '1';
      }
   }

   if (changed)
   {
      localStorage['options'] = JSON.stringify(tmpOpt);
   }

   return tmpOpt;
}

function handleMessage(request, sender, sendResponse)
{
   if (request.cmd == 'getOptions')
   {
      sendResponse(options);
   }
   else if (request.cmd == 'setOptions')
   {
      for (var key in request.options)
      {
         localStorage[key] = request.options[key];
      }
   }
   else if (request.cmd == 'setPageActionIcon')
   {
      setPageIconForCurrentTab(request.mode);
   }
}

function showPageIcon(tabId, mode)
{
   if (mode == 'active')
   {
      chrome.pageAction.setIcon({
            'tabId': tabId, 
            'path': {
               '19': 'gray-die-19.png', 
               '38': 'gray-die-38.png'
            }
         });
      chrome.pageAction.setTitle({
         'tabId': tabId,
         'title': 'BGG++ is active on this page'
      });
      chrome.pageAction.show(tabId)
   }
   else if (mode == 'disabled')
   {
      chrome.pageAction.setIcon({
            'tabId': tabId, 
            'path': {
               '19': 'empty-die-19.png', 
               '38': 'empty-die-38.png'
            }
         });
      chrome.pageAction.setTitle({
         'tabId': tabId,
         'title': 'BGG++ is disabled'
      });
      chrome.pageAction.show(tabId)
   }
   else
   {
      chrome.pageAction.hide(tabId)
   }
}

function setPageIconForCurrentTab(mode)
{
   chrome.tabs.query({'active': true, 'currentWindow': true}, function (tabs)
   {
      console.log(tabs);
      if (tabs && tabs.length > 0)
      {
         showPageIcon(tabs[0].id, mode);
      }
   });
}

function initMessageListeners()
{
   chrome.runtime.onMessage.addListener(
      function(request, sender, sendResponse)
      {
         if (request != null && request.cmd != null)
         {
            handleMessage(request, sender, sendResponse);
         }
      }
   );

   chrome.pageAction.onClicked.addListener(
      function(tab)
      {
         if (options && options['disabled'] != 1)
         {
            options['disabled'] = 1;
            setPageIconForCurrentTab('disabled');
         }
         else
         {
            options['disabled'] = 0;
            setPageIconForCurrentTab('active');
         }
         saveOptions(options);
      }
   );
}

function loadOptions()
{
   options = getOptions();
}

function saveOptions()
{
   if (options)
   {
      localStorage['options'] = JSON.stringify(options);
   }
}

function onload()
{
   loadOptions();
   initMessageListeners();
}

//document.addEventListener('DOMContentLoaded', function() {onload();}, false);
onload();
