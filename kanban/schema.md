tables utilisées


**Ssir_strategie2


```
@grist.UserTable
class Ssir_strategie2:
  id_old_neplus_utiliser = grist.Text()
  objectif = grist.Text()
  sous_objectif = grist.Text()
  action = grist.Text()
  responsable = grist.Text()
  echeance = grist.Text()
  portee = grist.Text()
  ssir_principale_task = grist.ReferenceList('Ssir_principale_task', reverse_of='strategie_id')

  def _default_id2(rec, table, value, user):
    return rec.id

  id2 = grist.Int()
```

**Ssir_principale_task


```
@grist.UserTable
class Ssir_principale_task:
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
  strategie_id = grist.ReferenceList('Ssir_strategie2', reverse_of='ssir_principale_task')
  notes = grist.Text()
  projet = grist.Choice()
  urgence = grist.Choice()

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

  def _default_UUID(rec, table, value, user):
    return UUID()
  UUID = grist.Text()
  historique_statuts = grist.Date()

  def _default_date_derniere_maj(rec, table, value, user):
    return NOW()
  date_derniere_maj = grist.DateTime('Europe/Paris')
  statut_precedent = grist.Text()

  def _default_id_task(rec, table, value, user):
    return rec.id
  id_task = grist.Int()
  jalons = grist.Text()


```

