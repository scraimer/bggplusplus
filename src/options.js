var backgroundPage = chrome.extension.getBackgroundPage();

function saveChange(e)
{
   var tmpOpt = backgroundPage.getOptions();
   var id = e.target.id;
   if (tmpOpt[id] != null)
   {
      if (e.target.type == 'checkbox')
      {
         tmpOpt[id] = e.target.checked ? 1 : 0;
      }
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
      }
   }
}

document.addEventListener('DOMContentLoaded', function() { onload(); }, false);

