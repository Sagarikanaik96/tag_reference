#!/bin/bash

ls /home/erpuser
cd /home/erpuser/frappe-bench/apps
sudo rm -rf /home/erpuser/frappe-bench/apps/tag_workflow
mkdir /home/erpuser/frappe-bench/apps/tag_workflow/
mv /home/erpuser/tag-workflow/* /home/erpuser/frappe-bench/apps/tag_workflow/
mv /home/erpuser/tag-workflow/.* /home/erpuser/frappe-bench/apps/tag_workflow/
cd /home/erpuser/frappe-bench/apps && ls
rm -rf /app/frappe-bench/apps/tag_workflow
cp -r tag_workflow/ /app/frappe-bench/apps/
cd /app/frappe-bench/apps/
pwd
sudo chown -R erpuser:erpuser /app/frappe-bench/apps/tag_workflow/
sudo python3.8 -m pip install -U -e tag_workflow
sudo chown -R erpuser:erpuser /app/
bench setup requirements
bench build --app tag_workflow
sudo rm /app/frappe-bench/sites/apps.txt
touch /app/frappe-bench/sites/apps.txt
echo -e "frappe\nerpnext\ntag_workflow" >> /app/frappe-bench/sites/apps.txt
chmod 644 /app/frappe-bench/sites/apps.txt
cat /app/frappe-bench/sites/apps.txt
ls -l /app/frappe-bench/sites/
bench setup requirements
bench migrate
sudo supervisorctl restart all
bench --site site1.local install-app tag_workflow
echo $(jq '.maintenance_mode |= 0' /app/frappe-bench/sites/common_site_config.json) > /app/frappe-bench/sites/common_site_config.json
sudo supervisorctl restart all
bench migrate