#!/bin/bash

sudo mv /home/erpuser/tag-workflow/* /home/erpuser/tag_workflow/
sudo mv /home/erpuser/tag-workflow/.* /home/erpuser/tag_workflow/

cd /home/erpuser/frappe-bench/apps && ls
python3 -m pip install -U -e tag_workflow
bench update
bench setup requirements
bench build --app tag_workflow
sudo supervisorctl restart all