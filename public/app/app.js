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
        "ui.bootstrap"
    ])

    // Disable debug traces
    .config(['$compileProvider', function ($compileProvider) {
        $compileProvider.debugInfoEnabled(true);
    }])
    .run(["$log", "$rootScope", "simpleLogin", function($log, $rootScope, simpleLogin) {
        $log.debug('Running app'); //debug
    }]);

}(angular = window.angular || {});
