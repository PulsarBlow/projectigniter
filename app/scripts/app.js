(function(angular) {
    'use strict';
    angular.module('app', [
        'ngAnimate',
        'app.config',
        'app.routes',
        'app.controllers',
        'app.directives',
        'app.decorators',
        'app.filters',
        'app.services',
        'ui.sortable',
        'ui.bootstrap',
        'timer'
    ])

        // Disable debug traces
        .config(['$compileProvider', function ($compileProvider) {
            $compileProvider.debugInfoEnabled(true);
        }])

        // Config tooltips
        .config(['$tooltipProvider', function($tooltipProvider){
            $tooltipProvider.options({appendToBody: true, popupDelay: 250});
        }])

        .run(['$log', '$rootScope', '$window', 'activityService', function($log, $rootScope, $window, activityService) {
            $log.debug('Running app'); //debug
            $window.moment.locale('fr');
            $rootScope.$on('activity:trigger', function(event, args) {
                $log.debug('activity event received : %s', args.name);
                if(activityService.exist(args.name)) {
                    //activityService.publish(arg.name, user, userProfile);
                }
            });
        }]);

})(window.angular || {});
