module.exports = async function (context, eventHubMessages) {
    context.log(`JavaScript eventhub trigger function called for message array ${eventHubMessages}`);
    
    eventHubMessages.forEach((message, index) => {

        try{
          context.log(`New message: ${message}`);
          var processedItems = ProcessMessage(message);

          //foreach not a function error so converted to standard for()
          for(let eventIndex=0; eventIndex < processedItems.length; eventIndex++)
          {
            context.log('CEF Event: ' + processedItems[eventIndex]);
          }
        }
        catch(err)
        {
          context.log(err);
        }
    });
};




/*
        "operationName": "Microsoft.ContainerService/managedClusters/diagnosticLogs/Read",
        "category": "kube-apiserver",
        "ccpNamespace": "5e389635e591690001a20769",
        "resourceId": "/SUBSCRIPTIONS/648DCB5A-DE1E-48B2-AF6B-FE6EF28D355C/RESOURCEGROUPS/SENTINEL-LAB/PROVIDERS/MICROSOFT.CONTAINERSERVICE/MANAGEDCLUSTERS/EJV-SEC1",
        "properties": {
          "log": "\t/usr/local/go/src/net/http/server.go:2007 +0x213\n",
          "stream": "stderr",
          "pod": "kube-apiserver-5c5ff66d9-9bfxz",
          "containerID": "a5e4cd9db96c564706d8035eaa7cbe20431cc11eed1e9222686a20d5fa7b22de"
        },
        "time": "2020-02-04T23:38:10.0000000Z",
        "Cloud": "AzureCloud",
        "Environment": "prod",
        "UnderlayClass": "hcp-underlay",
        "UnderlayName": "hcp-underlay-southcentralus-cx-15"
      },
*/

function ProcessMessage(message)
{
  var CEFFormattedEvents = [];
  var messageObj = JSON.parse(message);

  for(let eventIndex=0; eventIndex < messageObj.records.length; eventIndex++)
  {
    var parsedEvent = ConvertToCEF(messageObj.records[eventIndex]);
    CEFFormattedEvents.push(parsedEvent);
  }

  return CEFFormattedEvents;
}

function ConvertToCEF(event)
{
  var CEFHeader = BuildCEFHeader(event);
  //var extensionString = BuildExtensionPairs(logItem);

  return CEFHeader;
}

function BuildExtensionPairs(inputData)
{
  var returnString = '';
  try{
    var csvString = objectsToCsv(inputData);
  }
  catch(err)
  {
    context.log('ERROR: ' + err);
  }
  return returnString;
  
}

//Format
//   CEF:Version|Device Vendor|Device Product|Device Version|Device Event Class ID|Name|Severity|[Extension] 
//
function BuildCEFHeader(inputData) {
  var returnString = 'CEF:0|';

  //vendor
  returnString += 'Microsoft|';

  //product
  returnString +=  inputData['category'] + '|';

  //version
  returnString += '|';

  //Device Event Class ID / Signature
  returnString += '|';

  //Name
  returnString += inputData['operationName'] + '|';

  //Severity
  returnString += 'Unkown|'

  return returnString;

}

////////////////////////////
function getKeys(obj, prefix = '') {
	if (typeof obj === 'undefined' || obj === null) return [];
	return [
		...Object.keys(obj).map(key => `${prefix}${key}`),
		...Object.entries(obj).reduce((acc, [key, value]) => {
			if (typeof value === 'object') return [...acc, ...getKeys(value, `${prefix}${key}.`)];
			return acc;
		}, []),
	];
}
function flatObject(obj, prefix = '') {
	if (typeof obj === 'undefined' || obj === null) return {};
	return Object.entries(obj).reduce((acc, [key, value]) => {
		if (typeof value === 'object') return { ...acc, ...flatObject(value, `${prefix}${key}.`) };
		return { ...acc, [`${prefix}${key}`]: value };
	}, {});
}

function escapeCsvValue(cell) {
	if (cell.replace(/ /g, '').match(/[\s,"]/)) {
		return '"' + cell.replace(/"/g, '""') + '"';
	}
	return cell;
}

function objectsToCsv(arrayOfObjects) {
	// collect all available keys
	const keys = new Set(arrayOfObjects.reduce((acc, item) => [...acc, ...getKeys(item)], []));
	// for each object create all keys
	const values = arrayOfObjects.map(item => {
		const fo = flatObject(item);
		const val = Array.from(keys).map((key) => (key in fo ? escapeCsvValue(`${fo[key]}`) : ''));
		return val.join(',');
	});
	return `${Array.from(keys).join(',')}\n${values.join('\n')}`;
}