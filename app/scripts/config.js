(function(angular) {
    'use strict';
    angular.module('app.config', ['ui.bootstrap'])

    // Firebase data URL
    .value('FBURL', 'https://projectigniter-demo.firebaseio.com')
    // Overrides during development
    // @if DEBUG
    .value('FBURL', 'https://burning-inferno-9731.firebaseio.com')
    // @endif

    .constant('MAX_FAVORITES', 5)

    .constant('ANONYMOUS_ID', 'local:anonymous')

    .constant('LOCAL_PROVIDER', 'local')

    .constant('loginRedirectPath', '/signin')

    .constant('ACTIVITY_LIMIT', 50)

    .config(['$compileProvider', '$logProvider', function ($compileProvider, $logProvider) {
        $compileProvider.debugInfoEnabled(false);
        $logProvider.debugEnabled(false);
        // @if DEBUG
        $compileProvider.debugInfoEnabled(true);
        $logProvider.debugEnabled(true);
        // @endif
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
    }])
    ;
})(window.angular || {});
