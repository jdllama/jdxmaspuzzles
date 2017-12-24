window.getCookie = function(name) {
    match = document.cookie.match(new RegExp(name + '=([^;]+)'));
    if (match) return match[1];
  }
  

window.onload = function() {
    /*
    document.getElementById("myForm").onsubmit = function() {

        alert(getCookie("username");
        return true;
    }
    */
    console.log("Yes?");
    document.getElementById("myForm").addEventListener("submit", function(event) {
        event.preventDefault();
        alert(getCookie("username"));
    });
}