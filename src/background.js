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
