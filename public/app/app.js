!function(angular) {
    "use strict";
    angular.module("app", [
        "ngAnimate",
        "app.config",
        "app.routes",
        "app.controllers",
        "app.directives",
        "app.filters",
        "app.services",
        "ui.sortable"
    ])

    // Disable debug traces
    .config(['$compileProvider', function ($compileProvider) {
        $compileProvider.debugInfoEnabled(true);
    }])
    .run(["$log", "simpleLogin", function($log, simpleLogin) {
        $log.debug('Running app'); //debug
        simpleLogin.getUser();
    }]);

}(angular = window.angular || {});
