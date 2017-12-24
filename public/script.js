window.getCookie = function(name) {
    match = document.cookie.match(new RegExp(name + '=([^;]+)'));
    if (match) return match[1];
}

window.onload = function() {
    document.getElementById("myForm").addEventListener("submit", function(event) {
        if(typeof getCookie("username") == "undefined") {
            event.preventDefault();
            alert("Please set a username and try the answer again.");
        }
    });
}