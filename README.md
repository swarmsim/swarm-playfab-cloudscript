docs
====
https://github.com/PlayFab/CloudScriptSamples

https://api.playfab.com/docs/tutorials/landing-automation/using-cloud-script

https://api.playfab.com/docs/tutorials/landing-automation/writing-custom-cloud-script

https://api.playfab.com/documentation/Server/method/GetTitleInternalData

settings
========
dev: https://developer.playfab.com/en-us/F810/servers/cloudscript , https://developer.playfab.com/en-us/F810/content/title-data

prod: https://developer.playfab.com/en-us/7487/servers/cloudscript , https://developer.playfab.com/en-us/7487/content/title-data

from the swarmsim JS console
============================

    PlayFabClientSDK.ExecuteCloudScript({FunctionName: 'helloWorld', FunctionParameter: {inputValue: 'foobar'}}, function(res) {console.log(res.data.FunctionResult)})
