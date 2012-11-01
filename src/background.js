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

   if (changed)
   {
      localStorage['options'] = JSON.stringify(tmpOpt);
   }

   return tmpOpt;
}

function insertCssForContentScript(tab, callback)
{
   var ajaxLoaderURL = chrome.extension.getURL('ajax-loader.gif');
   var css = 
      //".bggpluscontentscript_ajax { background-image: url('AJAX'); }";
      "@-webkit-keyframes bggpluscontentscript_myfirst { " +
      "  0% { background-color: silver; } " +
      "  100% { background-color: white; } " +
      "} " +
      ".bggpluscontentscript_ajax { " +
      "  background-color: silver; " +
      "  -webkit-animation: bggpluscontentscript_myfirst 3s linear 0s infinite alternate; " + 
      "}";
   css = css.replace('AJAX', ajaxLoaderURL);

   chrome.tabs.insertCSS(null /*tab.id*/, { 'code': css, },
      function ()
      {
         if (callback) { callback(1); }
      }
   );
}

function handleMessage(request, sender, sendResponse)
{
   if (request.cmd == 'getOptions')
   {
      sendResponse(options);
   }
   else if (request.cmd == 'insertCss')
   {
      insertCssForContentScript(sender.tab, sendResponse);
   }
}

function initMessageListeners()
{
   chrome.extension.onRequest.addListener(
      function(request, sender, sendResponse)
      {
         if (request != null && request.cmd != null)
         {
            handleMessage(request, sender, sendResponse);
         }
      }
   );
}

function loadOptions()
{
   options = getOptions();
}

function onload()
{
   loadOptions();
   initMessageListeners();
}

//document.addEventListener('DOMContentLoaded', function() {onload();}, false);
onload();
