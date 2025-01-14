// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock } from 'typemoq';
import { CosmosContainerClient, CosmosOperationResponse } from 'azure-services';
import { GuidGenerator } from 'common';
import { itemTypes, Page } from 'storage-documents';
import _ from 'lodash';
import { PartitionKeyFactory } from '../factories/partition-key-factory';
import { PageProvider } from './page-provider';
import { CosmosQueryResultsIterable, getCosmosQueryResultsIterable } from './cosmos-query-results-iterable';

describe(PageProvider, () => {
    const websiteId = 'website id';
    const pageId = 'page id';
    const url = 'url';
    const partitionKey = 'partition key';
    const pageDoc: Page = {
        id: pageId,
        websiteId: websiteId,
        url: url,
        itemType: itemTypes.page,
        partitionKey: partitionKey,
    };
    let cosmosContainerClientMock: IMock<CosmosContainerClient>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let partitionKeyFactoryMock: IMock<PartitionKeyFactory>;
    let cosmosQueryResultsProviderMock: IMock<typeof getCosmosQueryResultsIterable>;

    let testSubject: PageProvider;

    beforeEach(() => {
        cosmosContainerClientMock = Mock.ofType<CosmosContainerClient>();
        guidGeneratorMock = Mock.ofType<GuidGenerator>();
        partitionKeyFactoryMock = Mock.ofType<PartitionKeyFactory>();
        partitionKeyFactoryMock.setup((p) => p.createPartitionKeyForDocument(itemTypes.page, pageId)).returns(() => partitionKey);
        cosmosQueryResultsProviderMock = Mock.ofInstance(() => null);

        testSubject = new PageProvider(
            cosmosContainerClientMock.object,
            guidGeneratorMock.object,
            partitionKeyFactoryMock.object,
            cosmosQueryResultsProviderMock.object,
        );
    });

    afterEach(() => {
        guidGeneratorMock.verifyAll();
        cosmosContainerClientMock.verifyAll();
        partitionKeyFactoryMock.verifyAll();
        cosmosQueryResultsProviderMock.verifyAll();
    });

    describe('createPage', () => {
        it('creates page doc', async () => {
            guidGeneratorMock.setup((g) => g.createGuidFromBaseGuid(websiteId)).returns(() => pageId);
            cosmosContainerClientMock.setup((c) => c.writeDocument(pageDoc)).verifiable();

            const actualPage = await testSubject.createPageForWebsite(url, websiteId);
            expect(actualPage).toEqual(pageDoc);
        });
    });

    describe('updatePage', () => {
        it('throws if no id', () => {
            const pageData: Partial<Page> = {
                url: url,
            };

            expect(testSubject.updatePage(pageData)).rejects.toThrow();
        });

        it('updates doc with normalized properties', async () => {
            const updatedPageData: Partial<Page> = {
                lastScanTimestamp: 123456,
                id: pageId,
            };
            const expectedPageDoc = {
                itemType: 'page',
                partitionKey: partitionKey,
                ...updatedPageData,
            };
            const updatedPageDoc = {
                id: pageId,
                url: 'url',
            } as Page;
            const response: CosmosOperationResponse<Page> = {
                statusCode: 200,
                item: updatedPageDoc,
            };

            cosmosContainerClientMock
                .setup((c) => c.mergeOrWriteDocument(expectedPageDoc))
                .returns(async () => response)
                .verifiable();

            const actualUpdatedDoc = await testSubject.updatePage(updatedPageData);
            expect(actualUpdatedDoc).toEqual(updatedPageDoc);
        });
    });

    describe('readPage', () => {
        it('reads page with id', async () => {
            const response = {
                statusCode: 200,
                item: pageDoc,
            } as CosmosOperationResponse<Page>;
            cosmosContainerClientMock
                .setup((c) => c.readDocument(pageId, partitionKey))
                .returns(async () => response)
                .verifiable();

            const actualPage = await testSubject.readPage(pageId);

            expect(actualPage).toBe(pageDoc);
        });

        it('throws if unsuccessful status code', async () => {
            const response = {
                statusCode: 404,
            } as CosmosOperationResponse<Page>;
            cosmosContainerClientMock
                .setup((c) => c.readDocument(pageId, partitionKey))
                .returns(async () => response)
                .verifiable();

            expect(testSubject.readPage(pageId)).rejects.toThrow();
        });
    });

    describe('getPagesForWebsite', () => {
        it('calls cosmosQueryResultsProvider with expected query', () => {
            const expectedQuery = {
                query: 'SELECT * FROM c WHERE c.partitionKey = @partitionKey and c.websiteId = @websiteId and c.itemType = @itemType',
                parameters: [
                    {
                        name: '@websiteId',
                        value: websiteId,
                    },
                    {
                        name: '@partitionKey',
                        value: partitionKey,
                    },
                    {
                        name: '@itemType',
                        value: itemTypes.page,
                    },
                ],
            };
            const iterableStub = {} as CosmosQueryResultsIterable<Page>;

            partitionKeyFactoryMock.setup((p) => p.createPartitionKeyForDocument(itemTypes.page, websiteId)).returns(() => partitionKey);
            cosmosQueryResultsProviderMock.setup((o) => o(cosmosContainerClientMock.object, expectedQuery)).returns(() => iterableStub);

            const actualIterable = testSubject.getPagesForWebsite(websiteId);

            expect(actualIterable).toBe(iterableStub);
        });
    });
});
