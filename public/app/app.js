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
        "ui.sortable"
    ])

    // Disable debug traces
    .config(['$compileProvider', function ($compileProvider) {
        $compileProvider.debugInfoEnabled(true);
    }])
    .run(["$log", "$rootScope", "simpleLogin", function($log, $rootScope, simpleLogin) {
        $log.debug('Running app'); //debug
//        simpleLogin.getUser().then(function(data) {
//            $rootScope.auth = $rootScope.auth || {};
//            $rootScope.auth.user = data;
//            $log.debug('$rootScope auth is set'); //debug
//        });
    }]);

}(angular = window.angular || {});
