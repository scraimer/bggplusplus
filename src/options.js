var backgroundPage = chrome.extension.getBackgroundPage();

function saveChange(e)
{
   var tmpOpt = backgroundPage.getOptions();
   var id = e.target.id;
   if (e.target.type == 'checkbox')
   {
      tmpOpt[id] = e.target.checked ? 1 : 0;
   }
   else if (e.target.type == 'select-one')
   {
      tmpOpt[id] = e.target.value;
   }
   localStorage['options'] = JSON.stringify(tmpOpt);
   backgroundPage.options = tmpOpt;
}

function onload()
{
   document.getElementById('jumptosinglesearchresult')
      .addEventListener('change', saveChange, false);
   document.getElementById('searchresultscolumnsenable')
      .addEventListener('change', saveChange, false);
   document.getElementById('prevNextSubscriptionToolbarShow')
      .addEventListener('change', saveChange, false);
   document.getElementById('showMicrobadgeCounts')
      .addEventListener('change', saveChange, false);

   var options = backgroundPage.getOptions();
   for (var id in options)
   {
      var elem = document.getElementById(id);
      if (elem != null)
      {
         if (elem.type == 'checkbox')
         {
            elem.checked = (options[id] == 1);
         }
         else if (elem.type == 'select-one')
         {
            for (var i in elem.options)
            {
               if (elem.options[i].value == options[id])
               {
                  elem.selectedIndex = i;
                  break;
               }
            }
         }
      }
   }
}

document.addEventListener('DOMContentLoaded', function() { onload(); }, false);

