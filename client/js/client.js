'use strict';

var app = new App();
var view = new View(app);

view.on('userNameChanged', function(newName) {
    app.changeName(newName);
}).on('serverChanged', function(newUrl) {
    app.changeServer(newUrl);
}).on('newMessage', function(text) {
    app.client.postMessage(text);
}).on("editMessage", function(msgId, newText) {
    app.client.editMessage(msgId, newText);
}).on('deleteMessage', function(id) {
    app.client.deleteMessage(id);
}).on('rollbackMessage', function(id) {
    app.client.rollbackMessage(id);
});

app.on('appStateChanged', function() {
    localStorage.setItem('AppState', app.persistableState());
    view.update();
}).on('historyChanged', function() {
    view.hideErrorMessage();
}).on('messageAdded', function(message) {
    view.addMessageInternal(message);
}).on('messageEdited', function(message) {
    view.editMessageInternal(message);
}).on('messageDeleted', function(messageId) {
    view.removeMessage(messageId);
}).on('abort', function() {
    view.cleanHistory();
});


document.onreadystatechange = function() {
    if (document.readyState == "complete") {
        app.startApplication()
    }
};

function defaultErrorHandler(message) {
    var error = 'ERROR:\n' + message + '\n';
    $("#offline").text(error);
    $("#offline").show(1000);
    console.error(message);
};

window.onerror = function(err) {
    defaultErrorHandler(err.toString());
};
