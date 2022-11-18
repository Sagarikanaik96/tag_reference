frappe.listview_settings['Employee Onboarding Template'] = {
    onload: (listview) =>{
        [listview.columns[2],listview.columns[4]] = [listview.columns[4], listview.columns[2]];
        [listview.columns[3], listview.columns[4]] = [listview.columns[4], listview.columns[3]];
        listview.render_header(listview);
    },
    refresh: () => {
        $('[data-original-title="Designation"]').hide();
    },
    formatters:{
        default_template: (val)=>{
            let value = val==1?'Yes': 'No';
            return `<div class="list-row-col ellipsis text-left "><span class="filterable ellipsis " title="">${value}</span></div>`;
        }
    }
}
