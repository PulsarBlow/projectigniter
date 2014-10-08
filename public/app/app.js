!function(angular) {
    "use strict";
    angular.module("app", [
        "ngAnimate",
        "app.config",
        "app.routes",
        "app.controllers",
        "app.directives",
        "app.decorators",
        "app.filters",
        "app.services",
        "ui.sortable",
        "ui.bootstrap",
        "timer"
    ])

    // Disable debug traces
    .config(['$compileProvider', function ($compileProvider) {
        $compileProvider.debugInfoEnabled(true);
    }])
    .run(["$log", "$rootScope", "$window", "simpleLogin", function($log, $rootScope, $window, simpleLogin) {
        $log.debug('Running app'); //debug
        $window.moment.locale("fr");
    }]);

}(angular = window.angular || {});
