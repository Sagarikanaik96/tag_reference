#!/bin/bash

ls /home/erpuser
mkdir /home/erpuser/frappe-bench/apps/tag_workflow/
mv /home/erpuser/tag-workflow/* /home/erpuser/frappe-bench/apps/tag_workflow/
mv /home/erpuser/tag-workflow/.* /home/erpuser/frappe-bench/apps/tag_workflow/
cd /home/erpuser/frappe-bench/apps && ls
sudo chown -R erpuser:erpuser /home/erpuser/frappe-bench/apps/tag_workflow/
sudo python3 -m pip install -U -e tag_workflow
bench update
bench setup requirements
sudo rm /home/erpuser/frappe-bench/sites/apps.txt
touch /home/erpuser/frappe-bench/sites/apps.txt
echo -e "frappe\nerpnext\ntag_workflow" >> /home/erpuser/frappe-bench/sites/apps.txt
chmod 644 /home/erpuser/frappe-bench/sites/apps.txt
cat /home/erpuser/frappe-bench/sites/apps.txt
ls -l /home/erpuser/frappe-bench/sites/
bench migrate
bench update
bench build --app tag_workflow
sudo supervisorctl restart all
bench --site site1.local install-app tag_workflow
sudo apt-get install jq -y
echo $(jq '.maintenance_mode |= 0' /home/erpuser/frappe-bench/sites/common_site_config.json) > /home/erpuser/frappe-bench/sites/common_site_config.json
sudo supervisorctl restart all