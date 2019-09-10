var globalNavToolbarHeight = 52;

Array.prototype.binarySearch = function(find, comparator) {
  var low = 0, high = this.length - 1,
      i, comparison;
  while (low <= high) {
    i = Math.floor((low + high) / 2);
    comparison = comparator(this[i], find);
    if (comparison < 0) { low = i + 1; continue; };
    if (comparison > 0) { high = i - 1; continue; };
    return i;
  }
  return null;
};

function getBggUsername()
{
   var c = document.cookie.split(';');
   for (var i=0; i < c.length; ++i)
   {
      var a = c[i].trim().split('=');
      if (a[0] == 'bggusername')
         return a[1];
   }
   return null;
}

function singleSearchResultJump()
{
   var rows = document.
      getElementById('collectionitems').
      getElementsByTagName('tr');
   var active = (rows.length == 2);

   if (active)
   {
      window.location.href = rows[1].getElementsByTagName('a')[0].href;
      return true;
   }

   return false;
}

function getExistingTable(tableDomElement)
{
   var cols = {};
   var rowsDomElements = tableDomElement.getElementsByTagName('tr');

   // Note: I'm not using getElementsByTagName('th'), in case they change it,
   // and in case some columns won't have TH
   var headers = rowsDomElements[0].children;
   var ths = {};
   for (i=0; i < headers.length; ++i)
   {
      var colName = 'bgg' + i;
      cols[colName] = {
         'name': colName,
         'label': headers[i].innerText.replace(/[^a-zA-Z]/, ' '),
         'domIndex': i, // position of column in table in DOM
         'ordinal': i, // position we want it to be in
         'hide': false
      };
      ths[colName] = headers[i];

      // Special case: The thumbnail columns doesn't have a header
      if (i == 1 && headers[i].innerText.length == 0)
      {
         cols[colName].label = '[Thumbnail]';
      }
   }

   // Build a lookup table to convert index-in-row into a column name
   var toColName = {}
   for (colName in cols)
   {
      toColName[cols[colName].domIndex] = colName;
   }

   // find the name of columns that has the Title-link
   var titleLinkColName = null;
   for (colName in cols)
   {
      if (cols[colName].label == 'Title')
      {
         titleLinkColName = colName;
         break;
      }
   }

   // Store all the TR-children (should be only TDs), so I can re-order them
   // later
   var rows = [];
   var bggIdToRowIndex = {};
   for (i=1; i < rowsDomElements.length; ++i)
   {
      var cellsDomElements = rowsDomElements[i].children;
      var cells = {};
      for (j=0; j < cellsDomElements.length; ++j)
      {
         var colName = toColName[j];
         cells[colName] = cellsDomElements[j];
      }
      var r = {'elem': rowsDomElements[i], 'tds': cells};
      if (cells[titleLinkColName])
      {
         var gameHref = cells[titleLinkColName].
            getElementsByTagName('a')[0].href;
         var matches = /\/(?:boardgame|boardgameexpansion)\/([0-9]+)\//.
            exec(gameHref);
         if (matches && matches.length > 1)
         {
            r.bggId = matches[1];
            // Note: we add 1, because we skipped row 0 (the header-row)
            bggIdToRowIndex[r.bggId] = i - 1;
         }
         else
         {
            console.log("Do not know how to get game ID from href='" +
                  gameHref + "'");
         }
      }
      rows.push(r);
   }

   return {
      'cols': cols,
      'toColName': toColName,
      'bggIdToRowIndex': bggIdToRowIndex,
      'rows': rows,
      'heads': ths
   }
}

function handleXmlSearchResultGameInfo(xmlDoc, cfg, t)
{
   var xmlBoardGames = xmlDoc.getElementsByTagName('boardgame');
   var games = {};
   var g = {};
   for (i=0; i < xmlBoardGames.length; ++i)
   {
      var xmlGame = xmlBoardGames[i];
      var id = xmlGame.getAttribute('objectid');
      games[id] = {};

      var j;
      for (j=0; j < xmlGame.childNodes.length; ++j)
      {
         var node = xmlGame.childNodes[j];
         if (node.nodeName == 'minplayers')
         {
            games[id].minPlayers = node.childNodes[0].nodeValue;
         }
         else if (node.nodeName == 'maxplayers')
         {
            games[id].maxPlayers = node.childNodes[0].nodeValue;
         }
         else if (node.nodeName == 'playingtime')
         {
            games[id].playingTime = node.childNodes[0].nodeValue;
         }
      }

      var row = t.rows[t.bggIdToRowIndex[id]];
      if (row)
      {

         if (cfg.cols['NumPlayers'].hide === false)
         {
            row.tds['NumPlayers'].innerHTML =
               games[id].minPlayers + ' - ' + games[id].maxPlayers;
            row.tds['NumPlayers'].className = '';
         }
         if (cfg.cols['PlayTime'].hide === false)
         {
            row.tds['PlayTime'].innerHTML =
               games[id].playingTime + " min";
            row.tds['PlayTime'].className = '';
         }
      }
      else
      {
         console.log("Error accessing row using id=" + id);
      }
   }
}

function searchResultsColumns(cfg)
{
   var games = {};
   var gameIds = [];
   var i;

   var tableElement = document.getElementById('collectionitems');
   var t = getExistingTable(tableElement);

   // Add our custom columns to the list of possibilities
   t.cols['NumPlayers'] = { 
      'name': 'NumPlayers',
      'label': 'Num Players',
      'getxml': true ,
      'hide': false
   };
   t.cols['PlayTime'] = { 
      'name': 'PlayTime',
      'label': 'Play Time',
      'getxml': true,
      'hide': true
   };

   // Now that we've read the existing columns, we can use that as the default
   // configuration if none exists
   if (cfg == null)
   {
      cfg = {};
      // This trick does a deep copy
      cfg.cols = JSON.parse(JSON.stringify(t.cols));
      // TODO: add the "Num Players" and "Play Time" to default columns
      // Hide the "Avg Rating" and "Num Voters"
      for (i in cfg.cols)
      {
         if (cfg.cols[i].label == 'Avg Rating' ||
               cfg.cols[i].label == 'Num Voters')
         {
            cfg.cols[i].hide = true;
         }
      }

      // Define a default set of columns and their order
      var labelOrder = ['Board Game Rank', '[Thumbnail]', 'Title', 'Num Players', 'Play Time'];

      for (colName in cfg.cols)
      {
         cfg.cols[colName].hide = true;
      }

      cfg.colOrder = [];
      for (i=0; i < labelOrder.length; ++i)
      {
         for (colName in cfg.cols)
         {
            if (cfg.cols[colName].label == labelOrder[i])
            {
               cfg.colOrder.push(colName);
               cfg.cols[colName].hide = false;
            }
         }
      }
   }

   // Rebuild the table's TH cells using the configuration
   var headRow = tableElement.getElementsByTagName('tr')[0];
   headRow.innerHTML = "";
   for (j=0; j < cfg.colOrder.length; ++j)
   {
      var colName = cfg.colOrder[j];
      var head = t.heads[colName];
      if (!head)
      {
         head = document.createElement('th');
         head.innerHTML = t.cols[colName].label;
         t.heads[colName] = head;
      }
      headRow.appendChild(t.heads[colName]);
   }

   // Go over each row, rebuild it using the configuration - hide existing
   // items and add new items
   var ajaxLoaderURL = //'ajax-loader.gif';
      chrome.extension.getURL('ajax-loader.gif');
   for (i=0; i < t.rows.length; ++i)
   {
      var row = t.rows[i];
      row.elem.innerHTML = "";

      for (j=0; j < cfg.colOrder.length; ++j)
      {
         var colName = cfg.colOrder[j];
         var td = row.tds[colName];
         if (!td)
         {
            td = document.createElement('td');
            if (cfg.cols[colName].getxml)
            {
               td.className = 'bggpluscontentscript_ajax';
            }
            else
            {
               td.innerHTML = "--";
            }
            row.tds[colName] = td;
         }
         row.elem.appendChild(td);
      }
   }

   var shouldGetXML = false;
   for (var colName in cfg.cols)
   {
      var col = cfg.cols[colName];
      if (col.getxml == 1 && (col.hide === false))
      {
         shouldGetXML = true;
         break;
      }
   }

   if (!shouldGetXML)
   {
      return;
   }

   // Collect all the BGG game-Ids to make a single request
   var gameIds = []
   for (i=0; i < t.rows.length; ++i)
   {
      gameIds.push(t.rows[i].bggId);
   }
   var gameInfoXmlUrl = "https://www.boardgamegeek.com/xmlapi/boardgame/" +
      gameIds.join(',');

   console.log(gameInfoXmlUrl);

   var xmlhttp = new XMLHttpRequest();
   xmlhttp.open("GET", gameInfoXmlUrl, true);
   xmlhttp.onreadystatechange = function (oEvent)
   {
      if (xmlhttp.readyState === 4) {
         if (xmlhttp.status === 200)
         {
            handleXmlSearchResultGameInfo(xmlhttp.responseXML, cfg, t);
         }
         else
         {
            // TODO: update the class-name of all the cells dependant on
            // xml-data 
            console.log("Error", xmlhttp.statusText);
            return;
         }
      }
   };
   xmlhttp.send(null);

   /*
   var chooseColumns = tableElement.parentElement.insertBefore(
            document.createElement('button'), tableElement);
   chooseColumns.innerHTML = 'Click here to change the columns in the table';
   chooseColumns.onclick = function() { TODO };

   var columnsDiv = tableElement.parentElement.insertBefore(
         document.createElement('div'), tableElement);
   var html = '';
   for (colName in cfg.cols)
   {
      html += '<div>' + cfg.cols[colName].label + '</div>';
   }
   columnsDiv.innerHTML = html;
   */
}

function scrollToPrevSubbed(newItemsAttr)
{
   // Determine where we are, and then figure out which is the next item
   // "above" us
   var currentPos = jQuery(window).scrollTop();

   var len = newItemsAttr.length;
   var nearest = -1, nearestDelta = -1;
   for (i=0; i < len; ++i)
   {
      var delta = newItemsAttr[i].top - currentPos;

      // Note: When we call scrollTo, it will only scroll to within 10 px of
      //       the element. So it we're already there, we should go to the next
      //       element.

      if ((nearest == -1) ||
            (delta < 0 && delta > nearestDelta))
      {
         nearest = i;
         nearestDelta = delta;
      }
   }

   if (nearest != -1)
   {
      $(document).scrollTo(newItemsAttr[nearest].item, 0, {offset: -globalNavToolbarHeight} );
   }

   return false;
}

function scrollToNextSubbed(newItemsAttr)
{
   // Determine where we are, and then figure out which is the next item
   // "below" us
   var currentPos = jQuery(window).scrollTop();

   var len = newItemsAttr.length;
   var nearest = -1, nearestDelta = -1;
   for (i=0; i < len; ++i)
   {
      var delta = newItemsAttr[i].top - currentPos - globalNavToolbarHeight;

      // Note: When we call scrollTo, it will only scroll to within 10 px of
      //       the element. So it we're already there, we should go to the next
      //       element.

      if ((nearest == -1 && delta > 10) ||
            (delta > 0 && delta < nearestDelta))
      {
         nearest = i;
         nearestDelta = delta;
      }
   }

   if (nearest != -1)
   {
      $(document).scrollTo(newItemsAttr[nearest].item, 0, {offset: -globalNavToolbarHeight} );
   }

   return false;
}

function updateToolbarByScrollPosition(
      newItemsAttr, totalItemNum, prevItem, nextItem)
{
   var currentPos = jQuery(window).scrollTop() + globalNavToolbarHeight;
   var passed = 0;
   var len = newItemsAttr.length;
   for (i=0; i < len; ++i)
   {
      if (newItemsAttr[i].top - currentPos <= 10)
      {
         passed = i+1;
      }
   }

   var scrolledToBottom =
      (document.body.scrollTop - document.body.scrollHeight) >=
      window.innerHeight;
   var prevEnable = (passed > 1);
   var nextEnable = (passed < len) && !scrolledToBottom;

   totalItemNum.innerHTML = passed;
   var n = jQuery(nextItem);
   if (nextEnable && n.hasClass('disabled')) n.removeClass('disabled');
   if (!nextEnable && !n.hasClass('disabled')) n.addClass('disabled');
   var p = jQuery(prevItem);
   if (prevEnable && p.hasClass('disabled')) p.removeClass('disabled');
   if (!prevEnable && !p.hasClass('disabled')) p.addClass('disabled');
}

function getSubscriptionsNewItemAttr(newItems)
{
   if (newItems.length == 0)
      throw 'No new items!';

   var itemsAttr = [];
   var len = newItems.length;
   for (i=0; i < len; ++i)
   {
      var item = jQuery(newItems[i]);
      itemsAttr.push({
         'top': item.offset().top,
         'item': item
      });
   }

   return itemsAttr.sort(function(a,b) { return a.top - b.top; });
}

var newItemsAttr = null;
function prevNextSubscriptionItemsInPage(options)
{
   var jqItems = jQuery('.subbed,.subbed_selected');
   if (jqItems.length == 0) return false;

   // If the option require keyboard shortcuts, then listen for them
   if ((options['shortcutKeyNextUnreadKey'] && options['shortcutKeyNextUnreadKey'].length && options['shortcutKeyNextUnreadEnable'] == 1) ||
         (options['shortcutKeyPrevUnreadKey'] && options['shortcutKeyPrevUnreadKey'].length && options['shortcutKeyPrevUnreadEnable'] == 1))
   {
      jQuery(document).keypress(function(event)
      {
         // ignore keystrokes in text inputs
         if ((event.target.type == "textarea") || (event.target.type == "text") || (event.target.type == "select-one"))
         {
            return true;
         }

         var keyAsLetter = String.fromCharCode(event.which);
         
         // Scroll to Next item on page
         if ((options['shortcutKeyNextUnreadEnable'] == 1) && (keyAsLetter == options['shortcutKeyNextUnreadKey']))
         {
            newItemsAttr = getSubscriptionsNewItemAttr(jqItems);
            return scrollToNextSubbed(newItemsAttr)
         }
         // Scroll to Previous item on page
         else if ((options['shortcutKeyPrevUnreadEnable'] == 1) && (keyAsLetter == options['shortcutKeyPrevUnreadKey']))
         {
            newItemsAttr = getSubscriptionsNewItemAttr(jqItems);
            return scrollToPrevSubbed(newItemsAttr)
         }
         // Navigate to next unread page in subscriptions
         else if ((options['shortcutKeyNextPageEnable'] == 1) && (keyAsLetter == options['shortcutKeyNextPageKey']))
         {
            window.location.href = 'https://boardgamegeek.com/subscriptions/next';
         }
      });
   }


   // Delete existing toolbars (Just in case.)
   jQuery('.bggpluscontentscript_toolbar').remove();

   newItemsAttr = getSubscriptionsNewItemAttr(jqItems);

   // Since the user is browsing her subscriptions' new items, we should
   // add a toolbar to allow skipping among them.
   var toolbar = document.createElement('div');
   toolbar.className = 'bggpluscontentscript_toolbar';
   toolbar.style.position = 'fixed';
   toolbar.style.top = (globalNavToolbarHeight + 3) + 'px';
   toolbar.style.right = '3px';
   toolbar.style.backgroundColor = 'pink';
   toolbar.style.border = '1px solid black';
   toolbar.style.webkitUserSelect = 'none';
   toolbar.style.padding = '3px';
   toolbar.style.opacity = '0.5';
   toolbar.onmouseover = function() { toolbar.style.opacity = 1; }
   toolbar.onmouseout = function() { toolbar.style.opacity = 0.5; }

   if (localStorage['hidePrevNextNewItemsText'] != '1')
   {
      var text1 = toolbar.appendChild(document.createElement('span'));
      text1.innerHTML =
         "BGG++: Use these buttons to jump among new items on this page.<br/>";
      text1.style.fontSize = '10px';

      var hideTextLink = toolbar.appendChild(document.createElement('div'));
      hideTextLink.style.color = 'blue';
      hideTextLink.style.textDecoration = 'underline';
      hideTextLink.style.fontSize = '10px';
      hideTextLink.style.cursor = 'pointer';
      hideTextLink.innerHTML = '[hide this text]';
      hideTextLink.onclick = function() {
         localStorage['hidePrevNextNewItemsText'] = '1';
         text1.style.display = 'none';
         hideTextLink.style.display = 'none';
      };
   }

   var nextPage = toolbar.appendChild(document.createElement('div'));
   nextPage.className = 'bggpluscontentscript_nextPage';
   nextPage.innerHTML = document.getElementsByClassName('subsicon')[0].innerHTML;
   nextPage.onclick = function() {
      window.location.href = 'https://boardgamegeek.com/subscriptions/next';
   };

   var totalItemNum = toolbar.appendChild(document.createElement('div'));
   totalItemNum.innerHTML = "/" + newItemsAttr.length;
   totalItemNum.style.fontSize = '13px';
   totalItemNum.style.float = 'right';
   totalItemNum.style.paddingRight = '3px';

   var currentItemNum = toolbar.appendChild(document.createElement('div'));
   currentItemNum.innerHTML = "0";
   currentItemNum.style.fontSize = '13px';
   currentItemNum.style.float = 'right';
   currentItemNum.style.paddingLeft = '3px';

   var prevItem = toolbar.appendChild(document.createElement('div'));
   prevItem.className = 'bggpluscontentscript_prevItem';
   prevItem.onclick = function() {
         newItemsAttr = getSubscriptionsNewItemAttr(jqItems);
         return scrollToPrevSubbed(newItemsAttr)
      };

   var nextItem = toolbar.appendChild(document.createElement('div'));
   nextItem.className = 'bggpluscontentscript_nextItem';
   nextItem.onclick = function() {
      newItemsAttr = getSubscriptionsNewItemAttr(jqItems);
      return scrollToNextSubbed(newItemsAttr)
   };

   document.body.appendChild(toolbar);

   // We want to fire the scroll-update right away, and also make sure that
   // we don't fire it on EVERY scroll (there might be a LOT). Instead, we
   // build in a delay.
   var scrollTimeout = null;
   var updateByScroll = function() {
      updateToolbarByScrollPosition(
         newItemsAttr, currentItemNum, prevItem, nextItem);
   };
   jQuery(window).on('scroll', function() {
      if (scrollTimeout == null) 
         scrollTimeout = setTimeout(function() {
            updateByScroll();
            scrollTimeout = null;
         }, 100);
   });
   updateByScroll();

   return true;
}

function showMicrobadgeCounts()
{
   var trIter = document.evaluate(
         '//*[@class="profile_title"]/text()[contains(.,"Microbadges for ")]' +
         '/ancestor::*[@class="profile_block"]/descendant::tr',
         document, null, XPathResult.ANY_TYPE, null);

   if (trIter == null) return;

   var node = trIter.iterateNext();
   var delayedUpdates = [];
   while(node)
   {
      var tds = node.getElementsByTagName('td');
      delayedUpdates.push({
         'td': tds[0],
         'num': tds[1].getElementsByClassName("mbimg").length + 
            tds[1].getElementsByClassName("tilebadge").length});
      node = trIter.iterateNext();
   }

   for (var i=0; i<delayedUpdates.length; ++i)
   {
      delayedUpdates[i].td.innerHTML += " [" + delayedUpdates[i].num + "]";
   }
}

function sendMsg_setPageIconForCurrentTab(iconMode)
{
   chrome.runtime.sendMessage(
      {'cmd':'setPageActionIcon', 'mode': iconMode});
}

function processPage(options)
{
   var href = location.href;
   href = href.replace(
         'http://www.boardgamegeek.com',
         'http://boardgamegeek.com',
         'https://www.boardgamegeek.com',
         'https://boardgamegeek.com');

   var action = 'none';
   if ((href.indexOf('http://boardgamegeek.com/geeksearch.php') == 0) ||
         (href.indexOf('https://boardgamegeek.com/geeksearch.php') == 0))
   {
      if (options['jumptosinglesearchresult'] == 1)
      {
         action = 'jump-search';
      }
      else if (options['searchresultscolumnsenable'] == 1)
      {
         action = 'search-columns';
      }
   }
   else if ((href.indexOf('http://boardgamegeek.com/user/') == 0) ||
         (href.indexOf('https://boardgamegeek.com/user/') == 0))
   {
      // A user's profile page
      if (options['showMicrobadgeCounts'] == 1)
      {
         action = 'microbadges'
      }
   }
   else
   {
      if (options['prevNextSubscriptionToolbarShow'] == '1')
      {
         action = 'try-show-toolbar';
      }
   }


   var iconMode = 'hide';
   if (options['disabled'] != 1)
   {
      if (action == 'jump-search')
      {
         iconMode = 'active';
         if(!singleSearchResultJump() && options['searchresultscolumnsenable'] == 1)
         {
            action = 'search-columns';
         }
      }
      if (action == 'search-columns')
      {
         iconMode = 'active';
         searchResultsColumns(options.searchresultcolumns);
      }
      if (action == 'microbadges')
      {
         iconMode = 'active';
         showMicrobadgeCounts();
      }
      if (action == 'try-show-toolbar')
      {
         if (prevNextSubscriptionItemsInPage(options))
         {
            iconMode = 'active';
         }
      }
      
      sendMsg_setPageIconForCurrentTab(iconMode);
   }
   else
   {
      // Only show the disabled icon if we had intented to do something on the page
      if (iconMode != 'none')
      {
         sendMsg_setPageIconForCurrentTab('disabled');
      }
   }
}


function onload()
{
   chrome.runtime.sendMessage(
      {'cmd':'getOptions'},
      function (options)
      {
         if (options != null)
         {
            processPage(options);
         }
      }
   );
}


jQuery(document).ready(function() { 
      onload();
});

