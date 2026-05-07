
var params = new URLSearchParams(window.location.search);

var bar = document.querySelectorAll(".bottom_element_grid");

var top = localStorage.getItem('top');
var bottom;

if (localStorage.getItem('bottom')){
    bottom = localStorage.getItem('bottom');

    bar.forEach((element) => {
        var image = element.querySelector('.bottom_element_image');
        var text = element.querySelector('.bottom_element_text');

        var send = element.getAttribute('send');
        if (send === bottom){
            image.classList.add(bottom + "_open");
            text.classList.add("open");
        }else{
            image.classList.remove(send + "_open");
            image.classList.add(send);
            text.classList.remove("open");
        }
    })
}

function sendTo(url, top, bottom){
    if (top) {
        localStorage.setItem('top', top);
    }
    if (bottom){
        localStorage.setItem('bottom', bottom);
    }
    
    window.location.href = url + window.location.search;
}

var options = { year: 'numeric', month: '2-digit', day: '2-digit' };
var optionsTime = { second: '2-digit', minute: '2-digit', hour: '2-digit' };

bar.forEach((element) => {
    element.addEventListener('click', () => {
        localStorage.removeItem('top');
        localStorage.removeItem('bottom');

        sendTo(element.getAttribute("send"))
    })
})

function getRandom(min, max) {
    return parseInt(Math.random() * (max - min) + min);
}

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

function gotNewData(data){

    var seriesAndNumber = localStorage.getItem('seriesAndNumber');
    if (!seriesAndNumber){
        seriesAndNumber = "";
        var chars = "ABCDEFGHIJKLMNOPQRSTUWXYZ".split("");
        for (var i = 0; i < 4; i++){
            seriesAndNumber += chars[getRandom(0, chars.length)];
        }
        seriesAndNumber += " ";
        for (var i = 0; i < 5; i++){
            seriesAndNumber += getRandom(0, 9);
        }
        localStorage.setItem('seriesAndNumber', seriesAndNumber);
    }

    var day = data['day'];
    var month = data['month'];
    var year = data['year'];

    var birthdayDate = new Date();
    birthdayDate.setDate(day);
    birthdayDate.setMonth(month-1);
    birthdayDate.setFullYear(year);

    localStorage.setItem('birthDay', birthdayDate.toLocaleDateString("pl-PL", options));

    var givenDate = birthdayDate;
    givenDate.setFullYear(givenDate.getFullYear() + 18);
    localStorage.setItem('givenDate', givenDate.toLocaleDateString("pl-PL", options));

    var expiryDate = givenDate;
    expiryDate.setFullYear(expiryDate.getFullYear() + 5);
    localStorage.setItem('expiryDate', expiryDate.toLocaleDateString("pl-PL", options));

    var sex = data['sex'];
    
    if (parseInt(year) >= 2000){
        month = 20 + parseInt(month);
    }
    
    var later;
    
    if (sex === "m"){
        later = "0295"
    }else{
        later = "0382"
    }
    
    if (day < 10){
        day = "0" + day
    }
    
    if (month < 10){
        month = "0" + month
    }
    
    var pesel = year.toString().substring(2) + month + day + later + "7";
    localStorage.setItem('pesel', pesel);

    var dataEvent = window['dataReloadEvent'];
    if (dataEvent){
        dataEvent(data);
    }
}

function safeGetStorage(key){
    try {
        var sessionValue = sessionStorage.getItem(key);
        if (sessionValue) return sessionValue;
    } catch (_) {}
    try {
        return localStorage.getItem(key);
    } catch (_) {}
    return null;
}

function safeSetStorage(key, value){
    try { localStorage.setItem(key, value); } catch (_) {}
    try { sessionStorage.setItem(key, value); } catch (_) {}
}

function getLocalUserData(){
    try {
        var raw = safeGetStorage('userData');
        if (!raw) return null;
        var parsed = JSON.parse(raw);
        if (parsed && parsed.name){
            return parsed;
        }
    } catch (_) {}
    return null;
}

loadData();
async function loadData() {
    var db = null;
    var data = null;
    try {
        db = await getDb();
        data = await getData(db, 'data');
    } catch (_) {}

    // Sprawdź czy są parametry URL
    var hasUrlParams = false;
    var urlData = {};
    
    if (params.has('name')) {
        hasUrlParams = true;
        urlData = {
            name: params.get('name'),
            surname: params.get('surname'),
            nationality: params.get('nationality'),
            familyName: params.get('familyName'),
            fathersName: params.get('fathersName') || '',
            mothersName: params.get('mothersName') || '',
            fathersFamilyName: params.get('fathersFamilyName'),
            mothersFamilyName: params.get('mothersFamilyName'),
            birthPlace: params.get('birthPlace'),
            countryOfBirth: params.get('countryOfBirth'),
            address1: params.get('adress1'),
            address2: params.get('adress2'),
            city: params.get('city'),
            sex: params.get('sex'),
        };
        
        var birthdayStr = params.get('birthday');
        if (birthdayStr) {
            var parts = birthdayStr.split('.');
            urlData.day = parseInt(parts[0]);
            urlData.month = parseInt(parts[1]);
            urlData.year = parseInt(parts[2]);
        }
    }

    if (hasUrlParams) {
        urlData['data'] = 'data';
        gotNewData(urlData);
        safeSetStorage('userData', JSON.stringify(urlData));
        if (db) {
            saveData(db, urlData);
        }
    } else if (data) {
        gotNewData(data);
    } else if (getLocalUserData()) {
        gotNewData(getLocalUserData());
    } else {
        // Fallback - próba pobrania z serwera (może nie działać w local)
        try {
            fetch('/get/card?' + params)
            .then(response => response.json())
            .then(result => {
                if (result && result.name) {
                    result['data'] = 'data';
                    gotNewData(result);
                    safeSetStorage('userData', JSON.stringify(result));
                    if (db) {
                        saveData(db, result);
                    }
                }
            })
            .catch(() => {
                // Ignoruj błąd jeśli serwer nie odpowiada
            });
        } catch(e) {
            // Ignoruj błąd
        }
    }
}

loadImage();
async function loadImage() {
    var db = null;
    var image = null;
    try {
        db = await getDb();
        image = await getData(db, 'image');
    } catch (_) {}

    var imageEvent = window['imageReloadEvent'];
    var localPhoto = safeGetStorage('userPhoto');

    // Sprawdź czy jest obraz w URL
    var imageUrl = params.get('image');
    
    if (imageUrl) {
        if (imageEvent) {
            imageEvent(imageUrl);
        }
        safeSetStorage('userPhoto', imageUrl);
        var imageData = {
            data: 'image',
            image: imageUrl
        };
        if (db) {
            saveData(db, imageData);
        }
    } else if (image && imageEvent) {
        safeSetStorage('userPhoto', image.image);
        imageEvent(image.image);
    } else if (localPhoto && imageEvent) {
        imageEvent(localPhoto);
    } else {
        // Fallback - próba pobrania z serwera
        try {
            fetch('/images?' + params)
            .then(response => response.blob())
            .then(result => {
                var reader = new FileReader();
                reader.readAsDataURL(result);
                reader.onload = (event) => {
                    var base = event.target.result;

                    if (base !== image){
                        if (imageEvent){
                            imageEvent(base);
                        }

                        var data = {
                            data: 'image',
                            image: base
                        }

                        safeSetStorage('userPhoto', base);
                        if (db) {
                            saveData(db, data)
                        }
                    }
                }
            })
            .catch(() => {
                // Ignoruj błąd jeśli serwer nie odpowiada
            });
        } catch(e) {
            // Ignoruj błąd
        }
    }
}

function getDb(){
    return new Promise((resolve, reject) => {
        var request = window.indexedDB.open('fobywatel', 1);

        request.onerror = (event) => {
            reject(event.target.error)
        }

        var name = 'data';

        request.onupgradeneeded = (event) => {
            var db = event.target.result;

            if (!db.objectStoreNames.contains(name)){
                db.createObjectStore(name, {
                    keyPath: name
                })
            }
        }

        request.onsuccess = (event) => {
            var db = event.target.result;
            resolve(db);
        }
    })
}

function getData(db, name){
    return new Promise((resolve, reject) => {
        var store = getStore(db);

        var request = store.get(name);
    
        request.onsuccess = () => {
            var result = request.result;
            if (result){
                resolve(result);
            }else{
                resolve(null);
            }
        }

        request.onerror = (event) => {
            reject(event.target.error)
        }
    });
}

function getStore(db){
    var name = 'data';
    var transaction = db.transaction(name, 'readwrite');
    return transaction.objectStore(name);
}

function saveData(db, data){
    return new Promise((resolve, reject) => {
        var store = getStore(db);

        var request = store.put(data);

        request.onsuccess = () => {
            resolve();
        }

        request.onerror = (event) => {
            reject(event.target.error)
        }
    });
}

function deleteData(db, key){
    return new Promise((resolve, reject) => {
        var store = getStore(db);

        var request = store.delete(key);

        request.onsuccess = () => {
            resolve();
        }

        request.onerror = (event) => {
            reject(event.target.error)
        }
    });
}
