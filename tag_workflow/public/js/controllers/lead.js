frappe.ui.form.on("Lead", {
  refresh: function (frm) {
    $('[class="btn btn-primary btn-sm primary-action"]').show();
    $('.custom-actions.hidden-xs.hidden-md').show();
    setTimeout(()=>{
      $('[data-label="Create"]').addClass("hide");
    }, 3000);
    view_contract(frm);
	  cur_frm.dashboard.hide();
    $('[data-original-title="Menu"]').hide()
    cur_frm.clear_custom_buttons();

    if(!frm.is_new()){
      frm.add_custom_button(__("Send Email"), function () {
        email_box(frm);
      });

    }
    reqd_fields(frm);
    hide_details();
    make_contract(frm);

    if(frm.doc.__islocal==1){
			cancel_lead(frm);
		}


    $(document).on('click', '[data-fieldname="owner_company"]', function(){
      companyhide(1250)
    });

    $('[data-fieldname="owner_company"]').mouseover(function(){
      companyhide(1000)
    })

      document.addEventListener("keydown", function(){
        companyhide(1000)
      })

    set_map(frm);
    hide_fields(frm);
    show_addr(frm);

  },
  sign:function(frm){
    if(frm.doc.sign){
			var regex = /[^0-9A-Za-z ]/g;
			if (regex.test(frm.doc.sign) === true){
				frappe.msgprint(__("Signature: Only alphabets and numbers are allowed."));
				frm.set_value('sign','')
				frappe.validated = false;
			}
		}
  },
  status:function(frm){
    if(frm.doc.__islocal!=1){
      frappe.db.get_value('Lead',{name:frm.doc.name},['status'],function(r){
        if(r.status=='Close' && frm.doc.status=='On Hold'){
          frappe.msgprint({
            message: __("You can not change the status from 'Close' to 'On-Hold' "),
            title: __("Error"),
            indicator: "red",
          });
          frappe.validated='False'
          frm.set_value('status',r.status)
        }
      })
    }
  },
  validate: function (frm) {
    let phone = frm.doc.phone_no;
    let email = frm.doc.email_id;
    let zip = frm.doc.zip;
    if (phone && (phone.length != 10 || isNaN(phone))) {
      frappe.msgprint({
        message: __("Not Valid phone number"),
        indicator: "red",
      });
      frappe.validated = false;
    }
    if (
      email &&
      (email.length > 120 || !frappe.utils.validate_type(email, "email"))
    ) {
      frappe.msgprint({ message: __("Not A Valid Email"), indicator: "red" });
      frappe.validated = false;
    }
    if (zip && (zip.length != 5 || isNaN(zip))) {
      frappe.msgprint({ message: __("Not Valid Zip"), indicator: "red" });
      frappe.validated = false;
    }
  },
  setup: function (frm) {
    if(frappe.session.user!='Administrator' && frm.doc.__islocal==1){
      setting_owner_company(frm);
    }
  },
  organization_type: function (frm) {
    if (frm.doc.organization_type == "Exclusive Hiring") {
      tag_staff_company(frm);
    } else{
      frm.set_query("owner_company", function () {
        return {
          filters: [["Company", "organization_type", "in", ["TAG"]]],
        };
      });
    }
  },

  lead_owner: function (frm) {
    frm.set_query("lead_owner", function (doc) {
      return {
        query: "tag_workflow.utils.lead.lead_owner",
        filters: {
          owner_company: doc.owner_company,
        },
      };
    });
  },
  contact_by:function(frm){
    frm.set_query("contact_by", function (doc) {
      return {
        query: "tag_workflow.utils.lead.contact_person",
        filters: {
          owner_company: doc.owner_company,
        },
      };
    });
  },
  before_save: function(frm){
   if (frappe.boot.tag.tag_user_info.company_type=='Staffing') {
    frm.set_value("organization_type", "Exclusive Hiring");} 
    if(frm.doc.notes && frm.doc.user_notes){
      if(frm.doc.user_notes!=frm.doc.notes){
        cur_frm.set_value('user_notes',frm.doc.notes)
        cur_frm.set_value('notes','')
      }
    }
    else{
      cur_frm.set_value('user_notes',frm.doc.notes)  
      cur_frm.set_value('notes','')
    }
  },
  after_save:function(frm){
    if(frm.doc.user_notes && frm.doc.user_notes!=frm.doc.notes)
    {
      frappe.call({
        "method": "frappe.desk.form.utils.add_comment",
        'async':0,
        "args": {
          reference_doctype: frm.doctype,
          reference_name: frm.docname,
          content: frm.doc.user_notes,
          comment_email: frappe.session.user,
          comment_by: frappe.session.user_fullname,
          comment_type:'Comment'
            }
          });
          frm.reload_doc()
    }
  },
  dob:function(frm){
    check_bd(frm);
  },
  search_on_maps: function(frm){
    if(cur_frm.doc.search_on_maps == 1){
      tag_workflow.UpdateField(frm, "map");
      hide_fields(frm);
      show_addr(frm)
    }else if(cur_frm.doc.search_on_maps ==0 && cur_frm.doc.enter_manually==0){
      cur_frm.set_df_property('map','hidden',1)
    }
  },

  enter_manually: function(frm){
    if(cur_frm.doc.enter_manually == 1){
      tag_workflow.UpdateField(frm, "manually");
      show_fields(frm);
      show_addr(frm)
    }else if(cur_frm.doc.search_on_maps ==0 && cur_frm.doc.enter_manually==0){
      cur_frm.set_df_property('map','hidden',1)
      hide_fields(frm)
    }
  },
});

/*-------reqd------*/
function reqd_fields(frm) {
  let reqd = ["lead_name", "company_name", "email_id"];
  for (let r in reqd) {
    cur_frm.toggle_reqd(reqd[r], 1);
  }

  let roles = frappe.user_roles;
  if (roles.includes("Tag Admin") || roles.includes("Tag User")) {
    cur_frm.toggle_reqd("organization_type", 1);
    frm.set_query("organization_type", function () {
      return {
        filters: [["Organization Type", "name", "!=", "Tag"]],
      };
    });
  } else {
    cur_frm.toggle_display("organization_type", 0);
  }
}

/*------------onboard----------------*/
function onboard_org(frm) {
  var email = frm.doc.email_id;
  var exclusive = frm.doc.company_name;
  var person_name = frm.doc.lead_name;
  var organization_type = frm.doc.organization_type;
  var lead = frm.doc.name;

  frappe.db.get_value(
    "User",
    { name: frappe.session.user },
    "company",
    function (r) {
      if (r && r.company) {
        frm
          .add_custom_button("Onboard Organization", function () {
            check_dirty()
              ? onboard_orgs(
                  lead,
                  exclusive,
                  r.company,
                  email,
                  person_name,
                  frm,
                  organization_type
                )
              : console.log("TAG");
          })
          .addClass("btn-primary");
      }
    }
  );
}

function check_dirty() {
  let is_ok = true;
  if (cur_frm.is_dirty() == 1) {
    frappe.msgprint("Please save the form before Onboard Organization");
    is_ok = false;
  }
  return is_ok;
}

/*-------onboard----------*/
function onboard_orgs(
  lead,
  exclusive,
  staffing,
  email,
  person_name,
  frm,
  organization_type
) {
  if (exclusive && email) {
    frappe.call({
      method: "tag_workflow.controllers.crm_controller.onboard_org",
      freeze: true,
      freeze_message:
        "<p><b>Please wait while we are preparing Organization for onboarding</b></p>",
      args: {
        "lead":lead,
        exclusive: exclusive,
        staffing: staffing,
        email: email,
        person_name: person_name,
        phone:frm.doc.phone_no,
        organization_type: organization_type,
      },
      callback: function (r) {
        console.log(r);
      },
    });
  } else {
    !exclusive
      ? cur_frm.scroll_to_field("company_name")
      : cur_frm.scroll_to_field("email_id");
    frappe.msgprint({
      message: __(
        "<b>Organization Name</b> and <b>Email Address</b> is required for Onboarding"
      ),
      title: __("Warning"),
      indicator: "red",
    });
  }
}

/*--------makecontract--------*/
let _contract = `<p><b>Staffing/Vendor Contract</b></p>
<p>This Staffing/Vendor Contract (“Contract”) is entered into by and between Staffing Company and Hiring Company as further described and as set forth below. By agreeing to the Temporary Assistance Guru, Inc. (“TAG”) End-User License Agreement, and using the TAG application service and website (the “Service”) Staffing Company and Hiring Company agree that they have a contractual relationship with each other and that the following terms apply to such relationship:</p>

<p>(1) The billing rate Hiring Company shall pay Staffing Company to hire each temporary worker provided by Staffing Company (the “Worker”) is the rate set forth by the TAG Service for the location and position sought to be filled, and this rate includes all wages, worker’s compensation premiums, unemployment insurance, payroll taxes, and all other employer burdens recruiting, administration, payroll funding, and liability insurance.</p>
<p>(2) Hiring Company agrees not to directly hire and employ the Worker until the Worker has completed at least 720 work hours. Hiring Company agrees to pay Staffing Company an administrative placement fee of $3,000.00 if Hiring Company directly employs the Worker prior to completion of 720 work hours.</p>
<p>(3) Hiring Company acknowledges that it has complete care, custody, and control of workplaces and job sites. Hiring Company agrees to comply with all applicable laws, regulations, and ordinances relating to health and safety, and agrees to provide any site/task specific training and/or safety devices and protective equipment necessary or required by law. Hiring Company will not, without prior written consent of Staffing Company, entrust Staffing Company employees with the handling of cash, checks, credit cards, jewelry, equipment, tools, or other valuables.</p>
<p>(4) Hiring Company agrees that it will maintain a written safety program, a hazard communication program, and an accident investigation program. Hiring Company agrees that it will make first aid kits available to Workers, that proper lifting techniques are to be used, that fall protection is to be used, and that Hiring Company completes regular inspections on electrical cords and equipment. Hiring Company represents, warrants, and covenants that it handles and stores hazardous materials properly and in compliance with all applicable laws.</p>
<p>(5) Hiring Company agrees to post Occupational Safety and Health Act (“OSHA”) of 1970 information and other safety information, as required by law. Hiring Company agrees to log all accidents in its OSHA 300 logs. Hiring Company agrees to indemnify and hold harmless Staffing Company for all claims, damages, or penalties arising out of violations of the OSHA or any state law with respect to workplaces or equipment owned, leased, or supervised by Hiring Company and to which employees are assigned.</p>
<p>(6) Hiring Company will not, without prior written consent of Staffing Company, utilize Workers to operate machinery, equipment, or vehicles. Hiring Company agrees to indemnify and save Staffing Company and Workers harmless from any and all claims and expenses (including litigation) for bodily injury or property damage or other loss as asserted by Hiring Company, its employees, agents, the owner of any such vehicles and/or equipment or contents thereof, or by members of the general public, or any other third party, arising out of the operation or use of said vehicles and/or equipment by Workers.</p>
<p>(7) Commencement of work by dispatched Workers, or Hiring Company’s signature on work ticket serves as confirmation of Hiring Company’s agreement to conditions of service listed in or referred to by this Contract.</p>
<p>(8) Hiring Company agrees not to place Workers in a supervisory position except for a Worker designated as a “lead,” and, in that position, Hiring Company agrees to supervise all Workers at all times.</p>
<p>(9) Billable time begins at the time Workers report to the workplace as designated by the Hiring Company.</p>
<p>(10) Jobs must be canceled a minimum of 24 hours prior to start time to avoid a minimum of four hours billing per Worker.</p>
<p>(11) Staffing Company guarantees that its Workers will satisfy Hiring Company, or the first two hours are free of charge. If Hiring Company is not satisfied with the Workers, Hiring Company is to call the designated phone number for the Staffing Company within the first two hours, and Staffing Company will replace them free of charge.</p>
<p>(12) Staffing Company agrees that it will comply with Hiring Company’s safety program rules.</p>
<p>(13) Overtime will be billed at one and one-half times the regular billing rate for all time worked over forty hours in a pay period and/or eight hours in a day as provided by state law.</p>
<p>(14) Invoices are due 30 days from receipt, unless other arrangements have been made and agreed to by each of the parties.</p>
<p>(15) Interest Rate: Any outstanding balance due to Staffing Company is subject to an interest rate of two percent (2%) per month, commencing on the 90th day after the date the balance was due, until the balance is paid in full by Hiring Company.</p>
<p>(16) Severability. If any provision of this Contract is held to be invalid and unenforceable, then the remainder of this Contract shall nevertheless remain in full force and effect.</p>
<p>(17) Attorney’s Fees. Hiring Company agrees to pay reasonable attorney’s fees and/or collection fees for any unpaid account balances or in any action incurred to enforce this Contract.</p>
<p>(18) Governing Law. This Contract is governed by the laws of the state of Florida, regardless of its conflicts of laws rules.</p>
<p>(19) If Hiring Company utilizes a Staffing Company employee to work on a prevailing wage job, Hiring Company agrees to notify Staffing Company with the correct prevailing wage rate and correct job classification for duties Staffing Company employees will be performing. Failure to provide this information or providing incorrect information may result in the improper reporting of wages, resulting in fines or penalties being imposed upon Staffing Company. The Hiring Company agrees to reimburse Staffing Company for any and all fines, penalties, wages, lost revenue, administrative and/or supplemental charges incurred by Staffing Company.</p>
<p>(20) WORKERS' COMPENSATION COSTS: Staffing Company represents and warrants that it has a strong safety program, and it is Staffing Company’s highest priority to bring its Workers home safely every day. AFFORDABLE CARE ACT (ACA): Staffing Company represents and warrants that it is in compliance with all aspects of the ACA.</p>
<p>(21) Representatives. The Hiring Company and the Staffing Company each certifies that its authorized representative has read all of the terms and conditions of this Contract and understands and agrees to the same.</p>
<p>(22) Extra Contract Language.</p>`;

function make_contract(frm) {
  if (
    cur_frm.is_dirty() != 1 &&
    frm.doc.status == "Contract Negotiation" &&
    (roles.includes("Tag Admin") ||
      roles.includes("Tag User") ||
      roles.includes("Staffing Admin") ||
      roles.includes("Staffing User"))
  ) {
    frm
      .add_custom_button("Prepare Contract", function () {
        run_contract(frm);
      })
      .addClass("btn-primary");
  }
}

function run_contract(frm) {
  frappe.db.get_value('Contract',{'staffing_company':cur_frm.doc.company,'hiring_company':cur_frm.doc.company_name,'lead':frm.doc.name},['name'],function(r){
    if(r.name){
      window.location.href='/app/contract/'+r.name
    }
    else{
      let contract = frappe.model.get_new_doc("Contract");
      contract.lead = frm.doc.name;
      contract.contract_prepared_by = frappe.session.user;
      contract.party_type = "Customer";
      contract.contract_terms = _contract;
      contract.staffing_company = cur_frm.doc.company;
      contract.hiring_company=cur_frm.doc.company_name;
      contract.end_party_user=cur_frm.doc.email_id;
      contract.party_name=cur_frm.doc.company;
      contract.contact_name = frm.doc.lead_name;
      frappe.set_route("form", contract.doctype, contract.name);
    }
  })
  
}

/*---------hide details----------*/
function hide_details() {
  let fields = [
    "source",
    "designation",
    "campaign_name",
    "mobile_no",
  ];
  for (let data in fields) {
    cur_frm.toggle_display(fields[data], 0);
  }
}

function setting_owner_company(frm) {
  if (frappe.user.has_role("Tag User")) {
    tag_staff_company(frm);
  } 
  else if(frappe.boot.tag.tag_user_info.company_type=='Staffing'){
    frm.set_value("organization_type", "Exclusive Hiring")
    frm.set_query("owner_company", function () {
      return {
        filters: [["Company", "organization_type", "in", ["Staffing"]],["Company", "make_organization_inactive", "=", 0]],
      };
    });
    frappe.call({
      method: "tag_workflow.tag_data.lead_org",
      args: { current_user: frappe.session.user },
      callback: function (r) {
        if (r.message == "success") {
          frm.set_value("owner_company", frappe.boot.tag.tag_user_info.company);
        } else {
          frm.set_value("owner_company", "");
        }
      },
    });
  }
}

function tag_staff_company(frm) {
  frm.set_query("owner_company", function () {
    return {
      filters: [["Company", "organization_type", "in", ["Staffing", "TAG"]]],
    };
  });
}


function cancel_lead(frm){
	frm.add_custom_button(__('Cancel'), function(){
		frappe.set_route("Form", "Lead");
	});
}
function view_contract(frm){
  if(frm.doc.__islocal!=1){
    frappe.db.get_value('Contract',{'staffing_company':cur_frm.doc.company,'hiring_company':cur_frm.doc.company_name,'lead':frm.doc.name},['name'],function(r){
      if(r.name){
          cur_frm.page.set_secondary_action(__('View Contract'), function(){
                window.location.href='/app/contract/'+r.name;
          })
        }
    })
  }
}

/*------birth date-------*/
function check_bd(frm){
  let date = frm.doc.dob || "";
  if(date && date >= frappe.datetime.now_date()){
    frappe.msgprint({message: __('<b>DOB</b> Cannot be Today`s date or Future date'), title: __('Error'), indicator: 'orange'});
    cur_frm.set_value("dob", "");
  }
}

function email_box(frm){
      var pop_up = new frappe.ui.Dialog({
        title: __('Send Email '),
        'fields': [
          {'fieldname': 'Email', 'fieldtype': 'Data','label':'To','reqd':1},
          {'fieldname': 'CC', 'fieldtype': 'Data','label':'CC'},
          {'fieldname': 'BCC', 'fieldtype': 'Data','label':'BCC'},
          {'fieldname': 'Subject', 'fieldtype': 'Data','label':'Subject'},
          {'fieldname': 'Content', 'fieldtype': 'Long Text','label':'Message'},
        ],
        primary_action: function(){
          pop_up.hide();
          var comment=pop_up.get_values();
          frappe.call({
            method:"tag_workflow.tag_data.send_email1",
            freeze:true,
            freeze_message:__("Please Wait ......."),
            args:{
              "user": frappe.session.user, "company_type": frappe.boot.tag.tag_user_info.company_type, "sid": frappe.boot.tag.tag_user_info.sid,
              "name": frm.doc.name, "recepients":comment["Email"], "subject":comment["Subject"], "content":comment["Content"], "cc":comment["CC"],
              "bcc":comment["BCC"],"doctype": frm.doc.doctype
            },
            callback: function() {
              frm.reload_doc()
            }
          });
        
        }
      });
      pop_up.show();
}


function companyhide(time) {
  setTimeout(() => {
    var txt  = $('[data-fieldname="owner_company"]')[1].getAttribute('aria-owns')
    var txt2 = 'ul[id="'+txt+'"]'
    var  arry = document.querySelectorAll(txt2)[0].children
    document.querySelectorAll(txt2)[0].children[arry.length-2].style.display='none'
    document.querySelectorAll(txt2)[0].children[arry.length-1].style.display='none'

    
  }, time)
}


function hide_fields(frm){
  frm.set_df_property('address_lines_2','hidden',frm.doc.address_lines_2?0:1);
  frm.set_df_property('county_2','hidden',frm.doc.county_2 ?0:1);
  frm.set_df_property('city_or_town','hidden',frm.doc.city_or_town ?0:1);
  frm.set_df_property('state_2','hidden',frm.doc.state2?0:1);
  frm.set_df_property('zip','hidden',frm.doc.zip?0:1);
  frm.set_df_property('country_2','hidden',frm.doc.country_2?0:1);
}
function show_fields(frm){
  frm.set_df_property('address_lines_2','hidden',0);
  frm.set_df_property('city_or_town','hidden',0);
  frm.set_df_property('state_2','hidden',0);
  frm.set_df_property('zip','hidden',0);
  frm.set_df_property('country_2','hidden',0);
}
function show_addr(frm){
  if(frm.doc.search_on_maps){
    frm.get_docfield('address_lines_1').label ='Complete Address';
  }else if(frm.doc.enter_manually){
    frm.get_docfield('address_lines_1').label ='Address Line 1';
  }
  frm.refresh_field('address_lines_1');
}
const html=`<!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body>
      <input class="form-control" placeholder="Search a location" id="autocomplete-address" style="height: 30px;margin-bottom: 15px;">
      <div class="tab-content" title="map" style="text-align: center;padding: 4px;">
        <div id="map" style="height:450px;border-radius: var(--border-radius-md);"></div>
      </div>

      <script src="https://maps.googleapis.com/maps/api/js?key=${frappe.boot.tag.tag_user_info.api_key}&amp;libraries=places&amp;callback=initPlaces" async="" defer=""></script>
      <script>
        let autocomplete;
        let placeSearch;
        let place;
        let componentForm = {
          street_number: "long_name",
          route: "long_name",
          locality: "long_name",
          administrative_area_level_1: "long_name",
          country: "long_name",
          postal_code: "long_name"
        };

        window.initPlaces = function() {
          let default_location = { lat: 38.889248, lng: -77.050636 };
          map = new google.maps.Map(document.getElementById("map"), {
            zoom: 8,
            center: default_location,
            mapTypeControl: false,
          });

          marker = new google.maps.Marker({map,});
          geocoder = new google.maps.Geocoder();

          if(jQuery( "#autocomplete-address" ).length ){
            autocomplete = new google.maps.places.Autocomplete(
              document.getElementById( "autocomplete-address" ),
              { types: [ "geocode" ] }
            );
            autocomplete.addListener( "place_changed", fillInAddress );
          }
        };

        function fillInAddress() {
          place = autocomplete.getPlace();
          if(!place.formatted_address && place.name){
            let val = parseFloat(place.name);
            if(!isNaN(val) && val <= 90 && val >= -90){
               let latlng = place.name.split(",");
               default_location = { lat: parseFloat(latlng[0]), lng: parseFloat(latlng[1]) };
               geocode({ location: default_location });
            }
          }else{
            make_address(place, "auto");
            geocode({ address: place.formatted_address });
          }
        }

        function geolocate() {
          if(navigator.geolocation) {
            navigator.geolocation.getCurrentPosition( function( position ) {
              var geolocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              var circle = new google.maps.Circle({
                center: geolocation,
                radius: position.coords.accuracy
              });
              autocomplete.setBounds( circle.getBounds() );
            });
          }
        }

        jQuery( "#autocomplete-address" ).on( "focus", function() {
          geolocate();
        });

        function geocode(request) {
          geocoder.geocode(request).then((result) => {
            const { results } = result;
            map.setCenter(results[0].geometry.location);
            marker.setPosition(results[0].geometry.location);
            marker.setMap(map);
            return results;
          }).catch((e) => {
            alert("Geocode was not successful for the following reason: " + e);
          });
        }

        function make_address(value, key){
          let data = {name:"",street_number:"",route:"",locality:"",administrative_area_level_1:"",country:"",postal_code:"",lat:"",lng:"",plus_code:""};
          if(key == "auto"){
            data["lat"] = value.geometry.location.lat();
            data["lng"] = value.geometry.location.lng();
            data["name"] = value.formatted_address;
            for(let i = 0; i < value.address_components.length; i++) {
              let addressType = value.address_components[i].types[0];
              if(componentForm[addressType]) {
                let val = value.address_components[i][componentForm[addressType]];
                let key = value.address_components[i].types[0];
                data[key] = val;
              }
            }
          }else{
            let values = value.results[0] || [];
            data["lat"] = (values ? values.geometry.location.lat() : "");
            data["lng"] = (values ? values.geometry.location.lng() : "");
            data["name"] = value.formatted_address;
            for(let i = 0; i < values.address_components.length; i++) {
              let addressType = values.address_components[i].types[0];
              if(componentForm[addressType]) {
                let val = values.address_components[i][componentForm[addressType]];
                let key = values.address_components[i].types[0];
                data[key] = val;
                                                        }
            }
          }
          update_address(data)
        }
        function update_address(data){
          frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "address_lines_1", document.getElementById("autocomplete-address").value);
          frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "address_lines_2", (data["street_number"]+" "+data["route"]));
          frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "state_2", data["administrative_area_level_1"]);
          frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "city_or_town", data["locality"]);
          frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "country_2", data["country"]);
          frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "zip", (data["postal_code"] ? data["postal_code"] : data["plus_code"]));
        }
      </script>
    </body>
  </html>
`;
function set_map (frm) {
  setTimeout(frm.set_df_property("map", "options", html), 500);
  if(frm.is_new()){
    frm.set_df_property('map','hidden',1);
    $('.frappe-control[data-fieldname="html"]').html('');
    $('.frappe-control[data-fieldname="map"]').html('');
  }else if(frm.doc.search_on_maps == 0 && frm.doc.enter_manually ==0){
    frm.set_df_property('map','hidden',1);
  }else if(frm.doc.enter_manually ==1){
    frm.set_df_property('map','hidden',1);
  }
}