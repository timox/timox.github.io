tables utilisées


**Ssir_strategie2


```
@grist.UserTable
class Ssir_strategie2:
  id2 = grist.Text()
  objectif = grist.Text()
  sous_objectif = grist.Text()
  action = grist.Text()
  responsable = grist.Text()
  echeance = grist.Text()
  portee = grist.Text()
  ssir_principale_task = grist.ReferenceList('Ssir_principale_task', reverse_of='strategie_id')
```

**Ssir_principale_task


```
@grist.UserTable
class Ssir_principale_task:
  id_task = grist.Choice()
  titre = grist.Text()
  description = grist.Text()
  type_tache_id = grist.Reference('Ssir_type_task')
  bureau = grist.ChoiceList()

  def _default_qui(rec, table, value, user):
    return "non affecté"
  qui = grist.ChoiceList()

  def _default_impact(rec, table, value, user):
    return "Mineur"
  impact = grist.Choice()

  def _default_statut(rec, table, value, user):
    return "non défni"
  statut = grist.Choice()
  date_debut = grist.Date()
  date_echeance = grist.Date()
  strategie_id = grist.Reference('Ssir_strategie2', reverse_of='ssir_principale_task')
  notes = grist.Text()
  projet = grist.Choice()
  urgence = grist.Choice()
  ssir_type_task = grist.ReferenceList('Ssir_type_task', reverse_of='id2')

  def _default_qualification_necessaire(rec, table, value, user):
    return "non"
  qualification_necessaire = grist.Choice()
  ssir_qualification = grist.Reference('Ssir_qualification', reverse_of='demande_id')

  def _default_datenow(rec, table, value, user):
    return NOW()
  datenow = grist.DateTime('Europe/Paris')

  def _default_str_qui(rec, table, value, user):
    return ', '.join(x for x in rec.qui)
  str_qui = grist.Text()

  def _default_date_creation(rec, table, value, user):
    return NOW()
  date_creation = grist.DateTime('Europe/Paris')

  def _default_date_modif(rec, table, value, user):
    return NOW()
  date_modif = grist.Text()

  def _default_Cree_par(rec, table, value, user):
    return user.Name
  Cree_par = grist.Text()

  def _default_strategie_objectif(rec, table, value, user):
    return rec.strategie_id.objectif if rec.strategie_id else None
  strategie_objectif = grist.Text()

  def _default_strategie_sous_objectif(rec, table, value, user):
    return rec.strategie_id.sous_objectif if rec.strategie_id else None
  strategie_sous_objectif = grist.Text()

  def _default_strategie_action(rec, table, value, user):
    return rec.strategie_id.action if rec.strategie_id else None
  strategie_action = grist.Text()

  def _default_strategie_id_sous_objectif(rec, table, value, user):
    return rec.strategie_id.sous_objectif
  strategie_id_sous_objectif = grist.Text()

  def _default_UUID(rec, table, value, user):
    return UUID()
  UUID = grist.Text()
  historique_statuts = grist.Date()

  def _default_date_derniere_maj(rec, table, value, user):
    return NOW()
  date_derniere_maj = grist.DateTime('Europe/Paris')
  statut_precedent = grist.Text()

  def _default_ref_task(rec, table, value, user):
    return UUID()
  ref_task = grist.Reference('Ssir_principale_task')

  @grist.formulaType(grist.Text())
  def priorite(rec, table):
    def calcul_priorite():
        # Récupération des valeurs d'impact et d'urgence
        impact = rec.impact
        urgence = rec.urgence
    
        # Définition de la matrice de priorité
        matrice = {
            ("Critique", "Immédiate"): "Urgent (1)",
            ("Critique", "Courte"): "Urgent (1)",
            ("Critique", "Moyenne"): "Élevé (2)",
            ("Critique", "Longue"): "Élevé (2)",
        
            ("Important", "Immédiate"): "Urgent (1)",
            ("Important", "Courte"): "Élevé (2)",
            ("Important", "Moyenne"): "Élevé (2)",
            ("Important", "Longue"): "Normal (3)",
        
            ("Modéré", "Immédiate"): "Élevé (2)",
            ("Modéré", "Courte"): "Normal (3)",
            ("Modéré", "Moyenne"): "Normal (3)",
            ("Modéré", "Longue"): "Faible (4)",
        
            ("Mineur", "Immédiate"): "Normal (3)",
            ("Mineur", "Courte"): "Normal (3)",
            ("Mineur", "Moyenne"): "Faible (4)",
            ("Mineur", "Longue"): "Faible (4)",
        }
    
        # Retourne la priorité ou une valeur par défaut si la combinaison n'existe pas
        return matrice.get((impact, urgence), "Normal (3)")
    return calcul_priorite()

  @grist.formulaType(grist.Text())
  def str_statut(rec, table):
    return str(rec.statut)

  @grist.formulaType(grist.Text())
  def str_urgence(rec, table):
    return str(rec.urgence)

  @grist.formulaType(grist.Text())
  def str_bureau(rec, table):
    return ', '.join(x for x in rec.bureau)

  @grist.formulaType(grist.Text())
  def str_impact(rec, table):
    return rec.impact


```

**User_Actions2

```
@grist.UserTable
class User_Actions2:
  id2 = grist.Reference('User_Actions2', reverse_of='User_Actions')
  task_id = grist.Int()
  action_type = grist.Text()

  def _default_timestamp(rec, table, value, user):
    return NOW()
  timestamp = grist.Text()
  old_value = grist.Text()
  new_value = grist.Text()
  details = grist.Text()

  def _default_user_name(rec, table, value, user):
    return user.Name
  user_name = grist.Text()
  User_Actions = grist.ReferenceList('User_Actions2', reverse_of='id2')
```
