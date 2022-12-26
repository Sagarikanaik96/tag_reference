frappe.listview_settings["Claim Order"] = {
  onload(listview){
    if(!["Hiring","TAG"].includes(frappe.boot.tag.tag_user_info.company_type)){
      cur_list.columns.splice(4, 1);
      cur_list.render_header(cur_list.columns[4]);
    }
  },
  refresh(listview) {
    $('[class="btn btn-primary btn-sm primary-action"]').show();
    $(".custom-actions.hidden-xs.hidden-md").show();
    listview.page.clear_primary_action();
    $("button.btn.btn-default.btn-sm.filter-button").hide();
    $("button.btn.btn-sm.filter-button.btn-primary-light").hide();
    if (
      listview.data[0]["approved_no_of_workers"] != 0 &&
      frappe.boot.tag.tag_user_info.company_type != "Staffing"
    ) {
      modify_head_count(listview);
    } else if (
      listview.filters.length == 1 &&
      frappe.boot.tag.tag_user_info.company_type != "Staffing"
    ) {
      listview.page.set_secondary_action("Select Head Count", () => {
        refresh(listview);
      },"octicon octicon-sync");
      $('.btn.btn-secondary.btn-default.btn-sm').attr('id', 'popup_inactive');
      $('.btn.btn-secondary.btn-default.btn-sm').click(() => {
        if($('.btn.btn-secondary.btn-default.btn-sm').attr('id')=='popup_inactive'){
          refresh(listview);
        }
      });
    } else if (
      listview.filters.length == 2 &&
      frappe.boot.tag.tag_user_info.company_type != "Staffing"
    ) {
      modify_head_count(listview);
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
        let link = val.split(" ").join("%");
        return `<span class=" ellipsis" title="" id="${val}-${f.name}">
						<a class="ellipsis" data-filter="${d.fieldname},=,${val}" data-fieldname="${val}-${f.name}" onclick=dynamic_route('${link}') >${val}</a>
					</span>
                    <script>
                    function dynamic_route(name){
                        var name1= name.replace(/%/g, ' ');
						localStorage.setItem("company", name1);
						window.location.href = "/app/dynamic_page";	
                    }
                    </script>`;
      }
    },
    job_order(val, d, f) {
      if (val) {
        return `<span class=" ellipsis2" title="" id="${val}-${f.name}">
                        <a class="ellipsis" href="/app/job-order/${val}" data-filter="${d.fieldname},=,${val}" data-fieldname="${val}-${f.name}">${val}</a>
                    </span>`;
      }
    },
    approved_no_of_workers(val, d, f) {
      if (typeof val == "number") {
        return `<span class=" ellipsis3" title="" id="${val}-${f.name}">
                <a class="ellipsis" data-filter="${d.fieldname},=,${val}" data-fieldname="${val}-${f.name}">${val}</a>
            </span>`;
      } else {
        return `<span class=" ellipsis3" title="" id="${val}-${f.name}">
						<a class="ellipsis" data-filter="${d.fieldname},=,${val}" data-fieldname="${val}-${f.name}">0</a>
					</span>`;
      }
    },
    staff_claims_no(val, d, f) {
      if (val) {
        return `<span class=" ellipsis4" title="" id="${val}-${f.name}">
						<a class="ellipsis" data-filter="${d.fieldname},=,${val}" data-fieldname="${val}-${f.name}">${val}</a>
					</span>`;
      }
    },
    staffing_organization_ratings (val, d, f) {
      let a = 0
      frappe.call({
        async:false,
         method:"tag_workflow.tag_workflow.doctype.company.company.check_staffing_reviews",
         args:{
           company_name: f.staffing_organization
         },
         callback:(r)=>{
           a = r
         }
     })
    return a.message ===0 ?'':`<span><span class='text-warning'>★</span> ${a.message}<span>`      
    },
  },
};


async function get_average_rate(c){
 return await frappe.call({
   async:false,
		method:"tag_workflow.tag_workflow.doctype.company.company.check_staffing_reviews",
		args:{
			company_name: c
		},
    callback:(r)=>{
      return r.message
    }
})
}


function refresh(listview) {
  frappe.call({
    method:
      "tag_workflow.tag_workflow.doctype.claim_order.claim_order.order_details",
    args: {
      doc_name: listview.data[0].job_order,
    },
    freeze:true,
    callback: function (rm) {
      frappe.db.get_value(
        "Job Order",
        { name: listview.data[0].job_order },
        [
          "company",
          "select_job",
          "from_date",
          "to_date",
          "no_of_workers",
          "per_hour",
        ],
       async function (r) {
          let date_sequence = checking_same_date(r)
          let data = rm.message;
          let profile_html = `<table><th>Staffing Company</th><th>Avg. Rating</th><th>Workers</th><th>Approve</th><th>Invoice Notes</th>`;
          profile_html=await html_data_selct_headcount(data,profile_html);

          let new_pop_up = new frappe.ui.Dialog({
            title: "Select Head Count",
            fields: [
              {
                fieldname: "html_job_title",
                fieldtype: "HTML",
                options: "<label>Job Title:</label>" + r["select_job"],
              },
              {
                fieldname: "html_per_hour",
                fieldtype: "HTML",
                options: "<label>Price:</label>$" + r["per_hour"].toFixed(2),
              },

              { fieldname: "inputdata2", fieldtype: "Column Break" },

              {
                fieldname: "html_date",
                fieldtype: "HTML",
                options: date_sequence    
              },
              {
                fieldname: "html_workers",
                fieldtype: "HTML",
                options:
                  "<label>No. Of Workers Required:</label>" +
                  r["no_of_workers"],
              },
              { fieldname: "inputdata1", fieldtype: "Section Break" },
              {
                fieldname: "staff_companies",
                fieldtype: "HTML",
                options: profile_html,
              },
            ],
            primary_action: function () {
              new_pop_up.hide();
              let data_len = data.length;
              let l = 0;
              let dict = {};

              dict = update_no(data_len, l, dict, data, r);
              if (Object.keys(dict.dict).length > 0 && dict.valid != "False") {
                frappe.call({
                  method:
                    "tag_workflow.tag_workflow.doctype.claim_order.claim_order.save_claims",
                  args: {
                    my_data: dict.dict,
                    doc_name: listview.data[0].job_order,
                  },
                  callback: function (r1) {
                    if (r1.message == 1) {
                      frappe.msgprint("Email Sent Successfully");
                      setTimeout(function () {
                        window.location.href =
                          "/app/job-order/" + listview.data[0].job_order;
                      }, 3000);
                    }
                  },
                });
              }
            },
          });
          show_popup(new_pop_up);

        }
      );
    },
  });
}

async function html_data_selct_headcount(data,profile_html) {
  for(let p in data) {
    let avg_rate=await get_average_rate(data[p].staffing_organization);

    profile_html+=`<tr>
                                <td style="margin-right:20px;" >${data[p].staffing_organization}</td>
                                <td>${avg_rate.message===0? '':`<span class='text-warning'>★ </span> ${avg_rate.message}`}</td>
                                <td>${data[p].staff_claims_no}</td>
                                <td><input type="number" id="_${data[p].staffing_organization}" min="0" max=${data[p].staff_claims_no}></td>
                                <td><textarea id="_${data[p].name}_notes" class="head_count_tittle " data-comp="${data[p].staffing_organization}" maxlength="160" ${(data[p].notes)? data[p].notes:""}> </textarea> </td>
                                </tr>`;
  }
  profile_html+=`</table>`;
  return profile_html;
}

function show_popup(new_pop_up){
  new_pop_up.$wrapper.on('hidden.bs.modal', () => {
    $('.btn.btn-secondary.btn-default.btn-sm').attr('id', 'popup_inactive');
  });
  if($('.btn.btn-secondary.btn-default.btn-sm').attr('id')=='popup_inactive'){
    $('.btn.btn-secondary.btn-default.btn-sm').attr('id', 'popup_active');
    new_pop_up.show();
    add_listener(new_pop_up,'staff_companies');
  }
}

function modify_head_count(listview) {
  listview.page.set_secondary_action("Modify Head Count",() => {
    modify_claims(listview);
  },"octicon octicon-sync");
  $('.btn.btn-secondary.btn-default.btn-sm').attr('id', 'popup_inactive');
  $('.btn.btn-secondary.btn-default.btn-sm').click(function() {
    if($('.btn.btn-secondary.btn-default.btn-sm').attr('id')=='popup_inactive'){
      modify_claims(listview);
    }
  });
}
function update_no(data_len, l, dict, data, r) {
  let valid = "";
  for (let i = 0; i < data_len; i++) {
    let y = document.getElementById("_" + data[i].staffing_organization).value;
    let notes=document.getElementById("_"+data[i].name+"_notes").value
    valid=check_notes_length(notes,data[i].staffing_organization)
    if (y.length == 0) {
      y = 0;
    }
    y = parseInt(y);
    l = parseInt(l) + parseInt(y);
    if (y < 0) {
      frappe.msgprint({
        message: __(
          "No Of Workers Can't Be less than 0 for:" +
            data[i].staffing_organization
        ),
        title: __("Error"),
        indicator: "red",
      });
      valid = "False";

      setTimeout(function () {
        location.reload();
      }, 6000);
    } else if (y > data[i].staff_claims_no) {
      frappe.msgprint({
        message: __(
          "Claims approved cannot be greater than the no. of workers claimed by Staffing Company:"
        ),
        title: __("Error"),
        indicator: "red",
      });
      valid = "False";

      setTimeout(function () {
        location.reload();
      }, 6000);
    } else if (l > r["no_of_workers"]) {
      frappe.msgprint({
        message: __("No Of Workers Exceed For Then required"),
        title: __("Error"),
        indicator: "red",
      });
      valid = "False";

      setTimeout(function () {
        location.reload();
      }, 6000);
    } else {
      if (y != 0) {
        y = { approve_count: y, notes: notes };
        dict[data[i].staffing_organization] = y;
      }
    }
  }
  return { dict, valid };
}

function modify_claims(listview) {
  
  frappe.call({
    method:
      "tag_workflow.tag_workflow.doctype.claim_order.claim_order.modify_heads",
    args: {
      doc_name: listview.data[0].job_order,
    },
    freeze:true,
    callback: function (rm) {
      frappe.db.get_value(
        "Job Order",
        { name: listview.data[0].job_order },
        [
          "company",
          "select_job",
          "from_date",
          "to_date",
          "no_of_workers",
          "per_hour",
          "worker_filled",
        ],
        async function (r) {
          let job_data = rm.message;
          let date_value = checking_same_date(r)
          let profile_html = `<table class="table-responsive"><th>Claim No.</th><th>Staffing Company</th><th>Avg. Rating</th><th>Claims</th><th>Claims Approved</th><th>Modifiy Claims Approved</th><th>Invoice Notes</th>`;
          profile_html=await html_data_modify_claims(job_data,profile_html);
          profile_html += `</table><style>th, td {
                            padding: 10px;
                          } input{width:100%;}
                        </style>`;

          let modified_pop_up = new frappe.ui.Dialog({
            title: "Select Head Count",
            fields: [
              {
                fieldname: "html_job_title1",
                fieldtype: "HTML",
                options: "<label>Job Title:</label>" + r["select_job"],
              },
              {
                fieldname: "html_per_hour1",
                fieldtype: "HTML",
                options: "<label>Price:</label>$" + r["per_hour"].toFixed(2),
              },
              { fieldname: "inputdata3", fieldtype: "Column Break" },
              {
                fieldname: "html_date1",
                fieldtype: "HTML",
                options: date_value    
              },
              {
                fieldname: "html_workers1",
                fieldtype: "HTML",
                options:
                  "<label>Remaining Workers Needed:</label>" +
                  (r["no_of_workers"] - r["worker_filled"]),
              },
              { fieldname: "inputdata2", fieldtype: "Section Break" },
              {
                fieldname: "staff_companies1",
                fieldtype: "HTML",
                options: profile_html,
              },
            ],
            primary_action: function () {
              modified_pop_up.hide();
              let data_len = job_data.length;
              let l = 0;
              let dict = {};

              dict = update_claims(data_len, l, dict, job_data, r);

              if(dict.valid1 != 'False')
              {
              update_db(dict,listview);
              }
            },
          });
          modified_pop_up.$wrapper.on('hidden.bs.modal', () => {
            $('.btn.btn-secondary.btn-default.btn-sm').attr('id', 'popup_inactive');
          });
          if($('.btn.btn-secondary.btn-default.btn-sm').attr('id')=='popup_inactive'){
            $('.btn.btn-secondary.btn-default.btn-sm').attr('id', 'popup_active');
            modified_pop_up.show();
            add_listener(modified_pop_up,'staff_companies1');
          }
        }
      );
    },
  });
}
async function html_data_modify_claims(job_data,profile_html) {
  for(let p in job_data) {
    let avg_rate=await get_average_rate(job_data[p].staffing_organization);
    profile_html+=`<tr>
                                <td>${job_data[p].name}</td>
                                <td style="margin-right:20px;" id="${job_data[p].claims}" >${job_data[p].staffing_organization}</td>
                                <td>${avg_rate.message===0? '':`<span class='text-warning'>★</span> ${avg_rate.message}`}</td>
                                <td id="${job_data[p].name}_claim">${job_data[p].staff_claims_no}</td>
                                <td>${job_data[p].approved_no_of_workers}</td>
                                <td><input type="number" id="${job_data[p].name}" min="0" max=${job_data[p].staff_claims_no} ${job_data[p].hide==1? "disabled":""}></td>
                                <td><textarea id="_${job_data[p].name}_notes" class="head_count_tittle" data-comp="${job_data[p].staffing_organization}" maxlength="160" > ${(job_data[p].notes)? (job_data[p].notes).trim():""}</textarea> </td>
                                </tr>`;
  }
  return profile_html;
}

function update_claims(data_len, l, dict, job_data, r) {
  let valid1 = "";
  let total_count = 0;
  const notes_dict = {};

  for (let i = 0; i < data_len; i++) {
    if (parseInt(document.getElementById(job_data[i].name).value) > parseInt(document.getElementById(job_data[i].name+"_claim").innerHTML)) {
      frappe.msgprint({
        message: __("Claims approved cannot be greater than the no. of workers claimed by Staffing Company:"),
        title: __("Warning"),
        indicator: "red",
      });
      valid1 = "False";
      console.log(valid1);
  
      setTimeout(function () {
        location.reload();
      }, 5000);
      break;
    }
    let y = document.getElementById(job_data[i].name).value;
    let notes=document.getElementById("_"+job_data[i].name+"_notes").value
    notes_dict[job_data[i].name]=notes.trim();
    valid1=check_notes_length(notes,job_data[i].staffing_organization)
    if (y.length == 0) {
      total_count += job_data[i].approved_no_of_workers;
      continue;
    }
    y = parseInt(y);
    l = parseInt(l) + parseInt(y);
    if (y == job_data[i].approved_no_of_workers) {
      frappe.msgprint({
        message: __(
          "No Of Workers Are Same that previously assigned For:" +
            job_data[i].name
        ),
        title: __("Error"),
        indicator: "red",
      });
      valid1 = "False";

      setTimeout(function () {
        location.reload();
      }, 5000);
    } else if (y < 0) {
      frappe.msgprint({
        message: __(
          "No Of Workers Can't Be less than 0 for:" +
            job_data[i].staffing_organization
        ),
        title: __("Error"),
        indicator: "red",
      });
      valid1 = "False";

      setTimeout(function () {
        location.reload();
      }, 5000);
    } else if (y > job_data[i].name) {
      frappe.msgprint({
        message: __("No Of Workers Exceed For:" + job_data[i].name),
        title: __("Error"),
        indicator: "red",
      });
      valid1 = "False";

      setTimeout(function () {
        location.reload();
      }, 5000);
    } else if (l > r["no_of_workers"] - r["worker_filled"]) {
      frappe.msgprint({
        message: __("No Of Workers Exceed For Than required "),
        title: __("Error"),
        indicator: "red",
      });
      valid1 = "False";
      
      setTimeout(function () {
        location.reload();
      }, 5000);
    }
    else {
      total_count += y;
      y = { approve_count: y, notes: notes };
      dict[job_data[i].name] = y;
    }

    
  }
  if (total_count > r["no_of_workers"]) {
    frappe.msgprint({
      message: __(
        "No Of Workers Exceed For Than required",
        total_count,
        r["no_of_workers"],
        r["worker_filled"],
        r["no_of_workers"] - r["worker_filled"]
      ),
      title: __("Error"),
      indicator: "red",
    });
    valid1 = "False";
    console.log(valid1)
    setTimeout(function () {
      location.reload();
    }, 5000);
  }
  let a = check_multi_staffcomp(job_data,data_len,valid1);
  if(a==1){
    return { dict, valid1, notes_dict };
  }
}

function update_notes(dict,doc_name){
  frappe.call({
    method: "tag_workflow.tag_workflow.doctype.claim_order.claim_order.update_notes",
    args:{data:dict.notes_dict,doc_name:doc_name}
   })
}

function update_db(dict,listview){
  if (Object.keys(dict.dict).length > 0 && dict.valid1 != "False") {
    frappe.call({
      method:
        "tag_workflow.tag_workflow.doctype.claim_order.claim_order.save_modified_claims",
      args: {
        my_data: dict.dict,
        doc_name: listview.data[0].job_order,
        notes_dict:dict.notes_dict
      },
      callback: function (r2) {
        if (r2.message == 1) {
          frappe.msgprint("Email Sent Successfully");
          setTimeout(function () {
            window.location.href =
              "/app/job-order/" + listview.data[0].job_order;
          }, 3000);
        }
      },
    });
  }else if(dict.valid!="False"){
     update_notes(dict,listview.data[0].job_order);
     setTimeout(function () {
      window.location.href =
        "/app/job-order/" + listview.data[0].job_order;
    }, 3000);
  }
}

function check_multi_staffcomp(job_data, data_len,valid1){
  if (valid1!="False"){
  let comp_list = [];
  let second_list = [];
  for (let i = 0; i < data_len; i++){
    if(!comp_list.includes(job_data[i].staffing_organization)){
      comp_list.push(job_data[i].staffing_organization);
    }
    else{
      if(!second_list.includes(job_data[i].staffing_organization)){
      second_list.push(job_data[i].staffing_organization)
      }
    }
  }
  if(comp_list.length == second_list.length){
    return check_count(second_list,job_data,data_len);
  }else{
    return check_count_comp_list(comp_list,job_data,data_len);
    
  }
}
}

function check_count(second_list,job_data,data_len){
  for (let i in  second_list){
      let counter = 0 ;
      let assign_worker = 0;
      for(let j=0 ;j<data_len; j++){
        if(second_list[i]==job_data[j].staffing_organization){
          let y = document.getElementById(job_data[j].name).value;
          if (y.length == 0) {
            console.log(y)
            counter += job_data[j].approved_no_of_workers;
          }
          else{
            counter+= parseInt(y);
            assign_worker = parseInt(job_data[j].assigned_worker);
          }
        }
      }
      // check errror
      if (assign_worker!= 0 &&  counter<assign_worker) {
        frappe.msgprint({
          message: __(`${assign_worker} Employees are assigned to this order. Number of required workers must be greater than or equal to number of assigned employees. Please modify the number of workers required or work with the staffing companies to remove an assigned employee.`),
          title: __("Error"),
          indicator: "red",
        });
        setTimeout(function () {
          location.reload();
        }, 3000);
        return 0
      }
      
    }
    //Success
    return 1;
}

function check_count_comp_list(comp_list,job_data,data_len){
  for (let i in comp_list) {
    let counter = 0;
    let assign_worker = 0;
    for (let j = 0; j < data_len; j++) {
        if (comp_list[i] == job_data[j].staffing_organization) {
            let y = document.getElementById(job_data[j].name).value;
            if (y.length == 0) {
                console.log(y)
                counter += job_data[j].approved_no_of_workers;
            } else {
                counter += parseInt(y);
                assign_worker = parseInt(job_data[j].assigned_worker);
            }
        }
    }
    //check error
    if (assign_worker != 0 && counter < assign_worker) {
        console.log(assign_worker, "++ais", counter)
        frappe.msgprint({
            message: __(`${assign_worker} Employees are assigned to this order. Number of required workers must be greater than or equal to number of assigned employees. Please modify the number of workers required or work with the staffing companies to remove an assigned employee.`),
            title: __("Error"),
            indicator: "red",
        });
        setTimeout(function() {
            location.reload();
        }, 3000);
        return 0
    }
  }
  //success
  return 1
}
function check_notes_length(notes,staffing_org){
  let valid1
  if(notes && ((notes).trim()).length>160){
    frappe.msgprint({
      message: __(
        "Only 160 characters are allowed in Notes for "+ staffing_org 
      ),
      title: __("Error"),
      indicator: "red",
    });
    valid1 = "False";

    setTimeout(function () {
      location.reload();
    }, 4000);
  }
  return valid1

}
function checking_same_date(r){
  let date_order
          if(frappe.format(r["from_date"], { fieldtype: "Date" })==frappe.format(r["to_date"], { fieldtype: "Date" })){
            date_order=`<label>Date:</label>
                    ${frappe.format(r["from_date"], { fieldtype: "Date" })}`
          }
          else{
            date_order =`<label>Date:</label>
                    ${frappe.format(r["from_date"], { fieldtype: "Date" })} 
                     to 
                    ${frappe.format(r["to_date"], { fieldtype: "Date" })}` 
          }
          return date_order
}

function add_listener(dialog,field){
  dialog.fields_dict[field].disp_area.querySelectorAll('textarea').
  forEach(area=>area.
    addEventListener('keyup',e=>update_textarea(e,field))
  )
}
function update_textarea(e,field){
  cur_dialog.fields_dict[field].disp_area.querySelectorAll('textarea').
  forEach(area=>{
    if(area.attributes['data-comp'].value == e.currentTarget.attributes['data-comp'].value){
      area.value = e.currentTarget.value
    }
  })
}