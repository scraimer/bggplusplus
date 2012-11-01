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

function searchResultsChooseColumns(cfg, t)
{

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
   chooseColumns.onclick = function() { searchResultsChooseColumns(cfg, t); };

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

function processPage(options)
{
   var href = location.href;
   href = href.replace(
         'http://www.boardgamegeek.com',
         'http://boardgamegeek.com');
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

   chrome.extension.sendRequest(
      {'cmd': 'insertCss'},
      function (success) {
         console.log(success ?
            "requestCssInsert: Inserted CSS successfully." :
            "requestCssInsert: Failure during CSS insertion.");
      });
   
}

document.addEventListener('DOMContentLoaded', function() { onload(); }, false);
