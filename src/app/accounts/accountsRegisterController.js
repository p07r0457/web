angular
    .module('bit.accounts')

    .controller('accountsRegisterController', function ($scope, $location, apiService, cryptoService, validationService,
        $analytics, $state, $timeout) {
        var params = $location.search();
        var stateParams = $state.params;
        $scope.createOrg = stateParams.org;

        if (!stateParams.returnState && stateParams.org) {
            $scope.returnState = {
                name: 'backend.user.settingsCreateOrg',
                params: { plan: $state.params.org }
            };
        }
        else if (!stateParams.returnState && stateParams.premium) {
            $scope.returnState = {
                name: 'backend.user.settingsPremium',
                params: { plan: $state.params.org }
            };
        }
        else {
            $scope.returnState = stateParams.returnState;
        }

        $scope.success = false;
        $scope.model = {
            email: params.email ? params.email : stateParams.email
        };
        $scope.readOnlyEmail = stateParams.email !== null;

        var registerOrgUserId = null;
        var registerToken = null;
        if(stateParams.returnState && stateParams.returnState.params &&
            stateParams.returnState.name === 'frontend.organizationAccept') {
            registerOrgUserId = stateParams.returnState.params.organizationUserId || null;
            registerToken = stateParams.returnState.params.token || null;
        }

        $timeout(function () {
            if ($scope.model.email) {
                $("#name").focus();
            }
            else {
                $("#email").focus();
            }
        });

        $scope.registerPromise = null;
        $scope.register = function (form) {
            var error = false;

            if ($scope.model.masterPassword.length < 8) {
                validationService.addError(form, 'MasterPassword', 'Master password must be at least 8 characters long.', true);
                error = true;
            }
            if ($scope.model.masterPassword !== $scope.model.confirmMasterPassword) {
                validationService.addError(form, 'ConfirmMasterPassword', 'Master password confirmation does not match.', true);
                error = true;
            }

            if (error) {
                return;
            }

            var email = $scope.model.email.toLowerCase();
            var makeResult, encKey;

            $scope.registerPromise = cryptoService.makeKeyAndHash(email, $scope.model.masterPassword).then(function (result) {
                makeResult = result;
                encKey = cryptoService.makeEncKey(result.key);
                return cryptoService.makeKeyPair(encKey.encKey);
            }).then(function (result) {
                var request = {
                    name: $scope.model.name,
                    email: email,
                    masterPasswordHash: makeResult.hash,
                    masterPasswordHint: $scope.model.masterPasswordHint,
                    key: encKey.encKeyEnc,
                    keys: {
                        publicKey: result.publicKey,
                        encryptedPrivateKey: result.privateKeyEnc
                    },
                    token: registerToken,
                    organizationUserId: registerOrgUserId
                };

                return apiService.accounts.register(request).$promise;
            }, function (errors) {
                validationService.addError(form, null, 'Problem generating keys.', true);
                return false;
            }).then(function (result) {
                if (result === false) {
                    return;
                }

                $scope.success = true;
                $analytics.eventTrack('Registered');
            });
        };
    });
