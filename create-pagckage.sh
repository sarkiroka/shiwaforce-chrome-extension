#!/bin/bash

echo "create package for chrome store..."
if [ -f "shiwaforce-chrome-extension.zip" ]; then
	rm shiwaforce-chrome-extension.zip
fi
zip -9 -r shiwaforce-chrome-extension.zip . -x ".git/*" -x .gitignore -x ".idea/*" -x create-package.sh -x *.zip
echo "package created!"
