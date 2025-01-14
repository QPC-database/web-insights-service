#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

# Set default ARM template file
registryTemplateFile="${0%/*}/../templates/container-registry.template.json"

exitWithUsageInfo() {
    # shellcheck disable=SC2128
    echo "
Usage: ${BASH_SOURCE} -r <resource group> [-t <container registry template file (optional)>]
"
    exit 1
}

# Read script arguments
while getopts ":r:t:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    t) registryTemplateFile=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z ${resourceGroupName} ]] || [[ -z ${registryTemplateFile} ]]; then
    exitWithUsageInfo
fi

# Deploy Azure Container registry
echo "Deploying Azure Container registry in resource group ${resourceGroupName} with template ${registryTemplateFile}"
az deployment group create \
    --resource-group "${resourceGroupName}" \
    --template-file "${registryTemplateFile}" \
    --query "properties.outputResources[].id" \
    -o tsv 1>/dev/null
echo "Azure Container registry successfully created."
