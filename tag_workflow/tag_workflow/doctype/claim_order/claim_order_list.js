frappe.listview_settings['Claim Order'] = {

    refresh(listview) {
	$('[class="btn btn-primary btn-sm primary-action"]').show();
	$('.custom-actions.hidden-xs.hidden-md').show();
        listview.page.clear_primary_action();
        $("button.btn.btn-default.btn-sm.filter-button").hide();
        $("button.btn.btn-sm.filter-button.btn-primary-light").hide();
        if((listview.data[0]["approved_no_of_workers"])!=0 && frappe.boot.tag.tag_user_info.company_type!='Staffing'){
            listview.page.set_secondary_action('Modify Head Count', () => modify_claims(listview), 'octicon octicon-sync');

        }

        else if((listview.filters).length==2 && frappe.boot.tag.tag_user_info.company_type!='Staffing'){  
            listview.page.set_secondary_action('Select Head Count', () => refresh(listview), 'octicon octicon-sync');
        }
        else if((listview.filters).length==3 && frappe.boot.tag.tag_user_info.company_type!='Staffing'){
            listview.page.set_secondary_action('Modify Head Count', () => modify_claims(listview), 'octicon octicon-sync');

        }

    },
	hide_name_column: true,
	/*button: {
		show: function(doc) {
			return doc.name;
		},
		get_label: function() {
			return __('View Profile');
		},
		get_description: function(doc) {
			return __('Open {0}', [`"Claim Order" ${doc.name}`]);
		},
		action: function(doc) {
			frappe.set_route('Form', "Claim Order", doc.name);         

		}
	},*/
    formatters: {
		staffing_organization(val, d, f) {
			if (val) {
                let link = val.split(' ').join('%');
				return `<span class=" ellipsis" title="" id="${val}-${f.name}">
						<a class="ellipsis" data-filter="${d.fieldname},=,${val}" data-fieldname="${val}-${f.name}" onclick=dynamic_route('${link}') >${val}</a>
					</span>
                    <script>
                    function dynamic_route(name){
                        var name1= name.replace(/%/g, ' ');
						localStorage.setItem("company", name1);
						window.location.href = "/app/dynamic_page";	
                    }
                    </script>`

            }
        },
        job_order(val, d, f) {
            if (val) {
                return `<span class=" ellipsis2" title="" id="${val}-${f.name}">
                        <a class="ellipsis" href="/app/job-order/${val}" data-filter="${d.fieldname},=,${val}" data-fieldname="${val}-${f.name}">${val}</a>
                    </span>`
  
            }
        }, 
        approved_no_of_workers(val, d, f) {
            if(typeof(val)=='number')
            {
                return `<span class=" ellipsis3" title="" id="${val}-${f.name}">
                <a class="ellipsis" data-filter="${d.fieldname},=,${val}" data-fieldname="${val}-${f.name}">${val}</a>
            </span>`
            }
			else{
				return `<span class=" ellipsis3" title="" id="${val}-${f.name}">
						<a class="ellipsis" data-filter="${d.fieldname},=,${val}" data-fieldname="${val}-${f.name}">0</a>
					</span>`

            }
        },  
        staff_claims_no(val, d, f) {
			if (val) {
				return `<span class=" ellipsis4" title="" id="${val}-${f.name}">
						<a class="ellipsis" data-filter="${d.fieldname},=,${val}" data-fieldname="${val}-${f.name}">${val}</a>
					</span>`

            }
        },
    }
        
};

function refresh(listview){
    frappe.call({
        method:"tag_workflow.tag_workflow.doctype.claim_order.claim_order.order_details",
        args:{
            'doc_name':listview.data[0].job_order
        },
        callback:function(rm){
            frappe.db.get_value("Job Order",{ name: listview.data[0].job_order},["company",'select_job','from_date','to_date','no_of_workers','per_hour'],function (r) {
                        var data = rm.message;
                        let profile_html = `<table><th>Staffing Company</th><th>Workers</th><th>Approve</th>`;
                        for(let p in data){

                            profile_html += `<tr>
                                <td style="margin-right:20px;" >${data[p].staffing_organization}</td>
                                <td>${data[p].staff_claims_no}</td>
                                <td><input type="number" id="_${data[p].staffing_organization}" min="0" max=${data[p].staff_claims_no}></td>
                                </tr>`;
                        }
                        profile_html+=`</table>`

                        let new_pop_up = new frappe.ui.Dialog({
                            title: "Select Head Count",
                            'fields': [
                                {fieldname: "html_job_title",fieldtype: "HTML",options:"<label>Job Title:</label>" + r['select_job']},
                                {fieldname: "html_per_hour",fieldtype: "HTML",options: "<label>Price:</label>$"+r['per_hour']},
    
                                {'fieldname': 'inputdata2', 'fieldtype': 'Column Break',},
    
                                {fieldname: "html_date",fieldtype: "HTML",options:"<label>Date:</label>"+ frappe.format(r['from_date'], {'fieldtype': 'Date'})+'--' +frappe.format(r['to_date'], {'fieldtype': 'Date'})},                            
                                {fieldname: "html_workers",fieldtype: "HTML",options: "<label>No. Of Workers Required:</label>"+r['no_of_workers']},
                                {'fieldname': 'inputdata1', 'fieldtype': 'Section Break',},
                                {fieldname: "staff_companies",fieldtype: "HTML",options:profile_html},

    
            
                            ],
                            primary_action: function(){
                                new_pop_up.hide();
                                var data_len=data.length
                                var l=0
                                var dict = {}

                                dict=update_no(data_len,l,dict,data,r)
                                if(Object.keys(dict.dict).length>0 && (dict.valid!="False"))
                                {
                                    frappe.call({
                                        method:"tag_workflow.tag_workflow.doctype.claim_order.claim_order.save_claims",
                                        args:{
                                            'my_data':dict.dict,
                                            'doc_name':listview.data[0].job_order
                                        },
                                        callback:function(){
                                            setTimeout(function () {
                                                window.location.href='/app/job-order/'+listview.data[0].job_order
                                            }, 3000);
                                                frappe.show_alert({message:__('Notification send successfully'),indicator:'green'}, 5);	
                                        }
                                    })
                                }
                            }
                        })
                        new_pop_up.show();
            })
        }
    })
}
function update_no(data_len,l,dict,data,r){
    let valid=""
    for(let i=0;i<data_len;i++){     
                               
        let y=document.getElementById("_"+data[i].staffing_organization).value
        if(y.length==0){
            y=0
        }
        y=parseInt(y)
        l=parseInt(l)+parseInt(y)
        if(y<0){
            frappe.msgprint({
                message: __("No Of Workers Can't Be less than 0 for:"+data[i].staffing_organization),
                title: __("Error"),
                indicator: "red",
              });
              valid = "False"

              setTimeout(function () {
                location.reload()                                    
              }, 6000);

        }

        else if(y>data[i].staff_claims_no)
        {
            frappe.msgprint({
                message: __("No Of Workers Exceed For:"+data[i].staffing_organization),
                title: __("Error"),
                indicator: "red",
              });
              valid = "False"

              setTimeout(function () {
                location.reload()                                    
              }, 6000);
        }
        else if(l>r['no_of_workers'])
        {
            frappe.msgprint({
                message: __("No Of Workers Exceed For Then required"),
                title: __("Error"),
                indicator: "red",
              });
              valid="False"

              setTimeout(function () {
                location.reload()                                    
              }, 6000);
        }
        else{
            if(y!=0){
                dict[data[i].staffing_organization]=y
            }
           

        }
    
    }
    return {dict,valid}
}



function modify_claims(listview){
    frappe.call({
        method:"tag_workflow.tag_workflow.doctype.claim_order.claim_order.modify_heads",
        args:{
            'doc_name':listview.data[0].job_order
        },
        callback:function(rm){
            frappe.db.get_value("Job Order",{ name: listview.data[0].job_order},["company",'select_job','from_date','to_date','no_of_workers','per_hour','worker_filled'],function (r) {
                        var job_data = rm.message;
                        let profile_html = `<table><th>Staffing Company</th><th>Claims</th><th>Claims Approved</th><th>Modifiy Claims Approved</th>`;
                        for(let p in job_data){

                            profile_html += `<tr>
                                <td style="margin-right:20px;" >${job_data[p].staffing_organization}</td>
                                <td>${job_data[p].staff_claims_no}</td>
                                <td>${job_data[p].approved_no_of_workers}</td>

                                <td><input type="number" id="_${job_data[p].staffing_organization}" min="0" max=${job_data[p].staff_claims_no}></td>
                                </tr>`;
                        }
                        profile_html+=`</table><style>th, td {
                            padding: 10px;
                          } input{width:100%;}
                        </style>`

                        let modified_pop_up = new frappe.ui.Dialog({
                            title: "Select Head Count",
                            'fields': [
                                {fieldname: "html_job_title1",fieldtype: "HTML",options:"<label>Job Title:</label>" + r['select_job']},
                                {fieldname: "html_per_hour1",fieldtype: "HTML",options: "<label>Price:</label>$"+r['per_hour']},
                                {'fieldname': 'inputdata3', 'fieldtype': 'Column Break',},
                                {fieldname: "html_date1",fieldtype: "HTML",options:"<label>Date:</label>"+ frappe.format(r['from_date'], {'fieldtype': 'Date'})+'--' +frappe.format(r['to_date'], {'fieldtype': 'Date'})},                            
                                {fieldname: "html_workers1",fieldtype: "HTML",options: "<label>No. Of Workers Required:</label>"+(r['no_of_workers']-r['worker_filled'])},
                                {fieldname: 'inputdata2', 'fieldtype': 'Section Break',},
                                {fieldname: "staff_companies1",fieldtype: "HTML",options:profile_html},
                            ],
                            primary_action: function(){
                                modified_pop_up.hide();
                                var data_len=job_data.length
                                var l=0
                                var dict = {}

                                dict=update_claims(data_len,l,dict,job_data,r)
                                if(Object.keys(dict.dict).length>0 && (dict.valid1!="False"))
                                {

                                    frappe.call({
                                        method:"tag_workflow.tag_workflow.doctype.claim_order.claim_order.save_modified_claims",
                                        args:{
                                            'my_data':dict.dict,
                                            'doc_name':listview.data[0].job_order
                                        },
                                        callback:function(){
                                            setTimeout(function () {
                                                window.location.href='/app/job-order/'+listview.data[0].job_order
                                            }, 2000); 
                                                frappe.show_alert({message:__('Notification send successfully'),indicator:'green'}, 5);	
	
                                        }
                                    })
                                }
                            }
                        })
                        modified_pop_up.show();
            })
        }
    })
}
function update_claims(data_len,l,dict,job_data,r){
    let valid1=""
    let total_count = 0
    for(let i=0;i<data_len;i++){     
                               
        let y=document.getElementById("_"+job_data[i].staffing_organization).value
        if(y.length==0){
            total_count  += job_data[i].approved_no_of_workers
            continue
        }
        y=parseInt(y)
        l=parseInt(l)+parseInt(y)
        if(y==job_data[i].approved_no_of_workers){
            frappe.msgprint({
                message: __("No Of Workers Are Same that previously assigned For:"+job_data[i].staffing_organization),
                title: __("Error"),
                indicator: "red",
              });
              valid1 = "False"

              setTimeout(function () {
                location.reload()                                    
              }, 5000);


        }
        else if(y<0){
            frappe.msgprint({
                message: __("No Of Workers Can't Be less than 0 for:"+job_data[i].staffing_organization),
                title: __("Error"),
                indicator: "red",
              });
              valid1 = "False"

              setTimeout(function () {
                location.reload()                                    
              }, 5000);

        }
    
        else if(y>job_data[i].staff_claims_no)
        {
            frappe.msgprint({
                message: __("No Of Workers Exceed For:"+job_data[i].staffing_organization),
                title: __("Error"),
                indicator: "red",
              });
              valid1 = "False"

              setTimeout(function () {
                location.reload()                                    
              }, 5000);
        }
        else if(l>(r['no_of_workers']-r['worker_filled']))
        {
            frappe.msgprint({
                message: __("No Of Workers Exceed For Than required"),
                title: __("Error"),
                indicator: "red",
              });
              valid1="False"

              setTimeout(function () {
                location.reload()                                    
              }, 5000);
        }
        else{
            total_count += y
            dict[job_data[i].staffing_organization]=y
        }
    
    }
    if (total_count > r['no_of_workers']-r['worker_filled']){
        frappe.msgprint({
            message: __("No Of Workers Exceed For Than required"),
            title: __("Error"),
            indicator: "red",
          });
          valid1="False"

          setTimeout(function () {
            location.reload()                                    
          }, 5000);
    }
    return {dict,valid1}
}
