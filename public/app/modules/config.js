!function(angular) {
    "use strict";
    angular.module("app.config", [])

    // Firebase data URL
    .constant("FBURL", "https://burning-inferno-9731.firebaseio.com")

    .constant("MAX_FAVORITES", 5)

    .constant("ANONYMOUS_ID", "local:anonymous")

    .constant("LOCAL_PROVIDER", "local")

    .constant("loginRedirectPath", "/signin")

    ;
}(angular = window.angular || {});
