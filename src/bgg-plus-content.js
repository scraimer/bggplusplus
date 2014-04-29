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
   var gameInfoXmlUrl = "http://www.boardgamegeek.com/xmlapi/boardgame/" +
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

      // Note: When we call ScrollTo, it will only scroll to within 10 px of
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
      $(newItemsAttr[nearest].item).ScrollTo();
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
      var delta = newItemsAttr[i].top - currentPos;

      // Note: When we call ScrollTo, it will only scroll to within 10 px of
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
      $(newItemsAttr[nearest].item).ScrollTo();
   }

   return false;
}

function updateToolbarByScrollPosition(
      newItemsAttr, totalItemNum, prevItem, nextItem)
{
   var currentPos = jQuery(window).scrollTop();
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
   var jqItems = jQuery('.subbed_selected').add('.subbed');
   if (jqItems.length == 0) return;

   // If the option require keyboard shortcuts, then listen for them
   if ((options['shortcutKeyNextUnreadKey'] && options['shortcutKeyNextUnreadKey'].length && options['shortcutKeyNextUnreadEnable'] == 1) ||
         (options['shortcutKeyPrevUnreadKey'] && options['shortcutKeyPrevUnreadKey'].length && options['shortcutKeyPrevUnreadEnable'] == 1))
   {
      jQuery(document).keypress(function(event)
      {
         // ignore keystrokes in text inputs
         if ((event.target.type == "textarea") || (event.target.type == "text") || (event.target.type == "select-one"))
         {
            return false;
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
            window.location.href = 'http://boardgamegeek.com/subscriptions/next';
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
   toolbar.style.top = '3px';
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
      window.location.href = 'http://boardgamegeek.com/subscriptions/next';
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

function parseG4ggGeekListItems(xmlDocument, statusElement, callback)
{
   var items = {};

   listItems = xmlDocument.getElementsByTagName('item');
   var geekListId = xmlDocument.firstChild.getAttribute('id');
   for (i=0; i < listItems.length; ++i)
   {
      var listItem = listItems[i];
      var itemid = parseInt(listItem.getAttribute('id'));
      items[itemid] = {
         'geeklistid': geekListId,
         'itemid': itemid,
         'name': listItem.getAttribute('objectname'),
         'imageid': parseInt(listItem.getAttribute('imageid')),
         'description':
            listItem.getElementsByTagName('body')[0].firstChild.nodeValue,
      };
   }
   console.log(items);

   var requestQueue = [];
   for (var i in items)
   {
      requestQueue.push(i);
   }

   function parseTippers(htmlData)
   {
      var prefix = 'Tipped by</div>'.toLowerCase();
      var data = htmlData.slice(htmlData.toLowerCase().indexOf(prefix) +
            prefix.length);
      
      var rg = new RegExp('href=["\'].*?/user/(.*?)["\']>(.*?)<\/a>&'
            + 'nbsp;([0-9]+\.[0-9]{2})', 'ig');
      var r  = new RegExp('href=["\'].*?/user/(.*?)["\']>(.*?)<\/a>&'
            + 'nbsp;([0-9]+\.[0-9]{2})', 'i');
      var items = data.match(rg);
      tippers = {};
      for (var i=0; i<items.length; ++i)
      {
         if (!items[i]) continue;
         var a = r.exec(items[i]);
         if (!a) continue;

         var sum = parseFloat(a[3], 10);

         tippers[a[2]] = {'user': a[2], 'link': a[1], 'sum': sum};
      }

      return tippers;
   }

   function getTippers(itemid, callback)
   {
      var cacheKey = 'BGG++CACHE-recommend-' + itemid;
      var cached = localStorage[cacheKey];
      if (cached)
      {
         try {
            cached = JSON.parse(cached);
         } catch(exception) {
            console.log('JSON parse error:' + exception);
            delete localStorage[cacheKey];
            return;
         }
         
         callback(parseTippers(cached.htmlData))
      }
      else
      {
         jQuery.ajax({
            'url': '/geekrecommend.php',
            'data': {
               'action': 'recspy',
               'itemtype': 'listitem',
               'itemid': itemid
            },
            'dataType': 'html',
            'complete': function(jqXHR, textStatus) {
               localStorage[cacheKey] = JSON.stringify({
                  'date': (new Date()).getTime(),
                  'htmlData': jqXHR.responseText
               });
               var tippers = (textStatus == "success") ?
                  parseTippers(jqXHR.responseText) : null;
               callback(tippers, textStatus);
            }
         });
      }
   }

   var inProgress = null;
   var queueServiceInterval = setInterval(function ()
   {
      if (requestQueue.length > 0 && inProgress == null)
      {
         var itemid = requestQueue.pop();
         inProgress = {'start': (new Date()).getTime(), 'itemid': itemid };

         statusElement.innerHTML = "Fetching tippers for " + itemid +
            ". There are " + requestQueue.length + " remaining.";
         setTimeout(function()
         {
            getTippers(itemid,
               function (tippers, requestStatus) {
                  items[itemid].tippers = tippers;
                  inProgress = null;
               });
         }, 10);
      }
      else if (requestQueue.length == 0)
      {
         statusElement.style.display = 'none';
         clearInterval(queueServiceInterval);
         queueServiceInterval = null;

         callback(items);
      }
   }, 100);
}

function getUrlToGeekListItem(geekListId, geekListItemId)
{
   return "http://boardgamegeek.com/geeklist/" + geekListId +
      "/item/" + geekListItemId + "#item" + geekListItemId;
}

function buildDomOfStatsForSingleList(out, items)
{
   var myUser = getBggUsername();
   out.appendChild(document.createElement('p')).innerHTML = 
      "The following is how much that " + myUser + 
      " spent on items in the scanned GeekList.";
   var ul = out.appendChild(document.createElement('ul'));
   for (var i in items)
   {
      var itemOut = ul.appendChild(document.createElement('li'));
      itemOut.style.border = '1px solid black';
      var itemLink = "<a href='" +
         getUrlToGeekListItem(items[i].geeklistid, items[i].itemid) + "'>" +
         items[i].name + "</a>";

      if (!items[i].tippers)
      {
         itemOut.innerHTML =
            "Error fetching tippers for item " +itemLink+ "<br/>";
         continue;
      }

      if (items[i].tippers[myUser])
      {
         var span1 = itemOut.appendChild(document.createElement('div'));
         span1.innerHTML = items[i].tippers[myUser].sum + 'gg on item ' +
            itemLink + '<br/>';

         var menu = itemOut.appendChild(document.createElement('div'));
         menu.style.backgroundColor = 'black';
         menu.style.color = 'green';
         var menuItemLink = menu.appendChild(document.createElement('a'));
         menuItemLink.innerHTML = "Go to item";
         menuItemLink.href =
            getUrlToGeekListItem(items[i].geeklistid, items[i].itemid);
         var menuTop10 = menu.appendChild(document.createElement('a'));
         menuTop10.innerHTML = "Top tippers";
         var menuDesc = menu.appendChild(document.createElement('a'));
         menuDesc.innerHTML = "Show description";
      }
   }
}

function showStatsForSingleList(geekListId, out, statusElement)
{
   // XXX For debug only: use cached copy
   if (localStorage['cachedItems'])
   {
      console.log('USING CACHED COPY. FOR DEBUGGING ONLY!');
      var items = JSON.parse(localStorage['cachedItems']);
      buildDomOfStatsForSingleList(out, items);
      return;
   }

   // Note: use the old BGG XML API, because there's no support for geeklists
   // in the new XML API 2
   var url = 'http://www.boardgamegeek.com/xmlapi/geeklist/' + geekListId;

   statusElement.innerHTML = "Fetching Geeklist " + geekListId + "...";

   jQuery.ajax({
      'url': url,
      'dataType': 'xml',
      'success': function(xmlDocument)
         {
            statusElement.innerHTML += "Done.<br/>Parsing...";
            parseG4ggGeekListItems(xmlDocument, statusElement, function(items)
            {
               out.innerHTML = getHtmlOfStatsForSingleList(items);

               // XXX For debug only: cache copy
               localStorage['cachedItems'] = JSON.stringify(items);
            });
         }
   });
}

function showG4ggPanel()
{
   var geekListIds = [149919,  // December 2012
       151135 // January 2013 
   ];

   var outParent = document.body.appendChild(document.createElement('div'));
   outParent.style.position = 'fixed';
   outParent.style.top = '30px';
   outParent.style.left = '100px';
   outParent.style.overflow = 'scroll';
   outParent.style.backgroundColor = 'silver';
   outParent.style.border = '1px solid black';
   outParent.style.color = 'black';
   outParent.style.zIndex = 1000;
   function resizeOutParent()
   {
      outParent.style.width = (parseInt(jQuery(window).width()) - 200) + 'px';
      outParent.style.height = (parseInt(jQuery(window).height()) - 60)  + 'px';
   }
   var resizeTimeout = null;
   jQuery(window).on('resize', function() {
      if (resizeTimeout) return;
      resizeTimeout = setTimeout(function() {
         resizeTimeout = null;
         resizeOutParent();
      }, 100);
   });
   resizeOutParent();

   var span1 = outParent.appendChild(document.createElement('span'));
   span1.innerHTML = "Enter the ID of the GeekList to scan for tips: ";
   var entryIdInput = outParent.appendChild(document.createElement('input'));
   entryIdInput.type = 'text';
   entryIdInput.value = localStorage['G4GG-scan-id'] || geekListIds[0];
   var scanButton = outParent.appendChild(document.createElement('button'));
   scanButton.innerHTML = "Scan";
   var span2 = outParent.appendChild(document.createElement('span'));
   span2.innerHTML = "<br/><br/>";

   var out = outParent.appendChild(document.createElement('div'));
   out.innerHTML = "";

   scanButton.onclick = function()
   {
      out.innerHTML = "";
      localStorage['G4GG-scan-id'] = entryIdInput.value;
      showStatsForSingleList(entryIdInput.value, out, statusElement);
      return false;
   };

   var statusElement = outParent.appendChild(document.createElement('div'));
   statusElement.style.position = 'fixed';
   statusElement.style.top = '0px';
   statusElement.style.left = '0px';
   statusElement.style.backgroundColor = 'silver';

   showStatsForSingleList(entryIdInput.value, out, statusElement);
}

function processPage(options)
{
   var href = location.href;
   href = href.replace(
         'http://www.boardgamegeek.com',
         'http://boardgamegeek.com');

   // If the user wishes that we "jump to single search result", then we
   // shouldn't even try to get the "custom columns" for the search results.
   if (href.indexOf('http://boardgamegeek.com/geeksearch.php') == 0)
   {
      var success = false;
      if (options['jumptosinglesearchresult'] == 1)
      {
         success = singleSearchResultJump();
      }

      if ((!success) && options['searchresultscolumnsenable'] == 1)
      {
         searchResultsColumns(options.searchresultcolumns);
      }
   }
   // A user's profile page
   else if (href.indexOf('http://boardgamegeek.com/user/') == 0)
   {
      if (options['showMicrobadgeCounts'] == 1)
      {
         showMicrobadgeCounts();
      }
   }
   else if (href.indexOf('http://boardgamegeek.com/contact') == 0)
   {
      showG4ggPanel();
   }
   else
   {
      var showNextSubbedToolbar = false;

      if (options['prevNextSubscriptionToolbarShow'] == '1')
      {
         prevNextSubscriptionItemsInPage(options);
      }
   }
}

function onload()
{
   chrome.extension.sendRequest(
      {'cmd':'getOptions'},
      function (response)
      {
         if (response != null)
         {
            processPage(response);
         }
      }
   );
}


jQuery(document).ready(function() { 
      onload();
});

