#!/bin/bash

# Ensure proper permission for codebase
sudo chown -R erpuser:erpuser /app/frappe-bench/apps/tag_workflow/

# Copy code to SSD
cp -r /home/erpuser/frappe-bench/apps/tag_workflow/ /app/frappe-bench/apps/

# Ensure proper permission for code on SSD
sudo chown -R erpuser:erpuser /app/