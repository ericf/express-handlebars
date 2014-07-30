/* global Handlebars, prompt */
'use strict';

// The client-side "app" which leverages the shared Handlebars "echo" template.
// This will prompt the user for a message, then echo it out by rendering the
// message using the shared template which was exposed by the server.
(function () {
    var button = document.getElementById('say');

    button.addEventListener('click', function (e) {
        var message = prompt('Say Something:', 'Yo yo'),
            echo    = document.createElement('div');

        echo.innerHTML = Handlebars.templates.echo({message: message});
        document.body.appendChild(echo);
    }, false);
}());
