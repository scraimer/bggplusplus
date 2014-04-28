var backgroundPage = chrome.extension.getBackgroundPage();

function saveChange()
{
   var tmpOpt = backgroundPage.getOptions();
   var all = document.getElementsByTagName("*");
	for (var i=0; i < all.length; ++i)
	{
   	var elem = all[i];
   	if (elem.type == 'checkbox')
   	{
      	tmpOpt[elem.id] = elem.checked ? 1 : 0;
   	}
   	else if (elem.type == 'select-one')
   	{
      	tmpOpt[elem.id] = elem.value;
   	}
   	else if (elem.type == 'text')
   	{
      	tmpOpt[elem.id] = elem.value;
   	}
	}
   localStorage['options'] = JSON.stringify(tmpOpt);
   backgroundPage.options = tmpOpt;
}

function listenForCheckBoxAndTextKey(enableId, keyId)
{
   document.getElementById(enableId)
      .addEventListener('change', function(e)
		{
			if (!e.target.value.checked)
			{
				document.getElementById(keyId).value = '';
			}
			saveChange();
		}, false);
   document.getElementById(keyId)
      .addEventListener('keyup', function(e)
		{
			document.getElementById(enableId).checked =
				(e.target.value.length > 0) ? 'checked' : '';
			saveChange();
		}, false);

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
	listenForCheckBoxAndTextKey('shortcutKeyNextUnreadEnable', 'shortcutKeyNextUnreadKey');
	listenForCheckBoxAndTextKey('shortcutKeyPrevUnreadEnable', 'shortcutKeyPrevUnreadKey');
	listenForCheckBoxAndTextKey('shortcutKeyNextPageEnable', 'shortcutKeyNextPageKey');

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
			else if (elem.type == 'text')
			{
				elem.value = options[id];
			}
      }
   }
}

document.addEventListener('DOMContentLoaded', function() { onload(); }, false);

