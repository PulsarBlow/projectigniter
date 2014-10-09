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

    // Config tooltips
    .config(["$tooltipProvider", function($tooltipProvider){
        $tooltipProvider.options({appendToBody: true, popupDelay: 250});
    }])

    .run(["$log", "$rootScope", "$window", "activityService", function($log, $rootScope, $window, activityService) {
        $log.debug('Running app'); //debug
        $window.moment.locale("fr");
        $rootScope.$on("activity:trigger", function(event, args) {
            $log.debug("activity event received : %s", args.name);
            if(activityService.exist(args.name)) {
                //activityService.publish(arg.name, user, userProfile);
            }
        });

        // DEBUG
        function cleanUp() {
            var ref = new Firebase("https://burning-inferno-9731.firebaseio.com/");
            ref.child("activities").set(null);
            ref.child("users").set(null);
            ref.child("userConfigs").set(null);
            ref.child("userProfiles").set(null);
            ref.child("votes").set(null);
        }
        $window.cleanUp = cleanUp;
    }]);

}(angular = window.angular || {});
