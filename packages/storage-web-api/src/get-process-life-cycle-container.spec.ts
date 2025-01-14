// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { AzureServicesIocTypes, CredentialsProvider, CredentialType, SecretProvider } from 'azure-services';
import { ServiceConfiguration } from 'common';
import * as inversify from 'inversify';
import { GlobalLogger } from 'logger';
import { IMock, Mock } from 'typemoq';
import { getProcessLifeCycleContainer } from './get-process-life-cycle-container';

describe(getProcessLifeCycleContainer, () => {
    let testSubject: inversify.Container;
    let secretProviderMock: IMock<SecretProvider>;

    beforeEach(() => {
        testSubject = getProcessLifeCycleContainer();
        secretProviderMock = Mock.ofType<SecretProvider>();
        testSubject.unbind(SecretProvider);
        testSubject.bind(SecretProvider).toConstantValue(secretProviderMock.object);
    });

    it('verifies dependencies resolution', () => {
        expect(testSubject.get(ServiceConfiguration)).toBeDefined();
        expect(testSubject.get(GlobalLogger)).toBeDefined();

        expect(testSubject.get(CredentialsProvider)).toBeDefined();
        expect(testSubject.get(SecretProvider)).toBeDefined();
        expect(testSubject.get(CredentialsProvider)).toBeDefined();
    });

    it('should not create more than one instance of container', () => {
        expect(getProcessLifeCycleContainer()).toBe(testSubject);
    });

    it('verifies credential type to be app service', () => {
        expect(testSubject.get(AzureServicesIocTypes.CredentialType)).toBe(CredentialType.AppService);
    });
});
