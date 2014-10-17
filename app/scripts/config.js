(function(angular) {
    'use strict';
    angular.module('app.config', [])

    // Firebase data URL
    .value('FBURL', 'https://projectigniter.firebaseio.com')
    // Overrides during development
    // @if DEBUG
    .value('FBURL', 'https://burning-inferno-9731.firebaseio.com')
    // @endif

    .constant('MAX_FAVORITES', 5)

    .constant('ANONYMOUS_ID', 'local:anonymous')

    .constant('LOCAL_PROVIDER', 'local')

    .constant('loginRedirectPath', '/signin')

    .constant('ACTIVITY_LIMIT', 50)

    ;
})(window.angular || {});
