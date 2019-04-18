// Coolsingel 207, 3012 AG Rotterdam, Nederland
// Halvemaanpassage 1, 3011 AH Rotterdam
// Westkade 3, 3467 PM Hekendorp, Nederland

const functions = require('firebase-functions');
const {dialogflow, Permission} = require('actions-on-google');


const LOCATION_INTENT = 'location';
const USER_INFO_INTENT = 'user_info';
const USER_INFO_YES_INTENT = 'user_info - yes';
const USER_INFO_NO_INTENT = 'user_info - no';
const DISTANCE = 800;
let nearestData; 

// Fake data
const DATA = [
    {
        lat: 51.924031,
        long: 4.483393,
        title: 'Dronkenlui, hangjongeren',
        desc: 'Het is al een uur onrustig door een groep hangjongeren hier, volgens mij zijn ze dronken. Ze maken veel lawaai en vallen voorbijgangers lastig.',
        category: 'user'
    },
    {
        lat: 51.917885,
        long: 4.481087,
        title: 'Wegwerkzaamheden Coolsingel',
        desc: 'Door de herconstructuering van de coolingsingel kan je rondom de gehele coolsingel geluidsoverlast ervaren.',
        category: 'work'
    }
];

const app = dialogflow();

app.intent(LOCATION_INTENT, (conv) => {
	conv.data.requestedPermission = 'DEVICE_PRECISE_LOCATION';
    return conv.ask(new Permission({
        context: 'om te zien of er al overlast is gemeld',
        permissions: conv.data.requestedPermission,
    }));
});

app.intent(USER_INFO_INTENT, (conv, params, permissionGranted) => {
    if (permissionGranted) {
        const {
            requestedPermission
        } = conv.data;
        if (requestedPermission === 'DEVICE_PRECISE_LOCATION') {
 
            const {coordinates} = conv.device.location;

            if (coordinates) {
                let nearest = [];

                for (let key in DATA) {
                    nearest.push(measure(coordinates.latitude, coordinates.longitude, DATA[key].lat, DATA[key].long));
                }

              	if(Math.min.apply(null, nearest) <= DISTANCE) {
                    const dataKey = arrayGetKey(nearest, Math.min.apply(null, nearest));
                    nearestData = DATA[dataKey];
                    return conv.ask(`${sayCategory(DATA[dataKey])}`);
                }
                nearestData = {category:'nothing'};
              	return conv.ask(`Zo te zien is er geen geluidsoverlast rond uw locatie gemeld bij de gemeente. Wilt u geluidsoverlast melden?`);
            } else {
                return conv.close('Sorry, ik kan niet vinden waar je bent');
            }
 
        }
    } else {
        return conv.close('Sorry, ik heb eerst toestemming nodig om je locatie op te halen.');
    }
});

app.intent(USER_INFO_YES_INTENT, (conv) => {
    return conv.close(`${sayInfoYes(nearestData.category)}`);
});

app.intent(USER_INFO_NO_INTENT, (conv) => {
    return conv.close(`${sayInfoNo(nearestData.category)}`);
});

function arrayGetKey(arr,val) {
    for (var i=0; i<arr.length; i++) {
        if (arr[i] === val) {               
            return i;
        }
    }
    return false;
}

function sayInfoYes(category) {
    switch(category) {
        case 'event':
        case 'work':
        case 'user':
            return `Oke, ik heb uw melding gekoppeld aan de bestaande melding.`;
        default:
            return `Oke, u kunt nu een nieuwe melding registreren. (is geregistreerd...).`;
    }
}

function sayInfoNo(category) {
    switch(category) {
        case 'event':
        case 'work':
        case 'user':
            return 'Oke, u kunt nu een nieuwe melding registreren. (is geregistreerd...).';
        default:
            return `Oke, ik zal geen melding doen.`;
    }
}

function sayCategory(data) {
    switch(data.category) {
        case 'event':
            return `Er is van te voren op uw locatie geluidsoverlast gemeld. Zo te zien is er een event gepland. Bekijk hier de omschrijving: ${data.title}. Heeft u hier last van?`;
        case 'work':
            return `Er is van te voren op uw locatie geluidsoverlast gemeld. Zo te zien zijn er werkzaamheden in de buurt. Bekijk hier de omschrijving: ${data.title}. Heeft u hier last van?`;
        default:
            return `Er is ook een andere gebruiker geweest die overlast heeft gemeld op jouw locatie. De melding was: ${data.title}. Komt dit overeen?`;
    }
}

// Generally used geo measurement function
function measure(lat1, lon1, lat2, lon2){
    var R = 6378.137; // Radius of earth in KM
    var dLat = lat2 * Math.PI / 180 - lat1 * Math.PI / 180;
    var dLon = lon2 * Math.PI / 180 - lon1 * Math.PI / 180;
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c;
    return d * 1000; // meters
}

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
