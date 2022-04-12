#!/bin/bash

# Ensure proper permission for codebase
sudo chown -R erpuser:erpuser /app/frappe-bench/apps/tag_workflow/

# Copy code to SSD
cp -r /home/erpuser/frappe-bench/apps/tag_workflow/ /app/frappe-bench/apps/

# Ensure proper permission for code on SSD
sudo chown -R erpuser:erpuser /app/

# Build the application
cd /app/frappe-bench/
bench setup requirements
bench build --app tag_workflow

# Run node rollup command
cd /app/frappe-bench/apps/tag_workflow
node /app/frappe-bench/apps/frappe/rollup/build.js --app tag_workflow
cd /app/frappe-bench/

bench migrate
sudo supervisorctl restart all
echo $(jq '.maintenance_mode |= 0' /app/frappe-bench/sites/common_site_config.json) > /app/frappe-bench/sites/common_site_config.json
sudo supervisorctl restart all
