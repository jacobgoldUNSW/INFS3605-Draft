import React, { useState } from 'react'
import { PEOPLE, photo } from '../../data/people'
import { getProduct } from '../../data/products'
import { useApp } from '../../state'
import { hrefFor } from '../../router'
import Modal from '../ui/Modal'
import Icon from '../ui/Icon'
import IconTile from '../ui/IconTile'
import PlaceholderTag from '../ui/PlaceholderTag'
import Rail from '../ui/Rail'

function StoryCard({ s, onOpen }) {
  const person = PEOPLE[s.person]
  return (
    <button type="button" className="story card-link" onClick={() => onOpen(s)} aria-label={`Read ${person.name}’s story`}>
      <div className="story-photo photo"><img src={photo(s.person, 640, 480)} alt="" loading="lazy" /></div>
      <div className="story-body">
        <PlaceholderTag />
        <p className="story-quote">{s.skeptic}</p>
        <div className="story-stat num">{s.stat}</div>
        <div className="story-foot">
          <span><b>{person.name}</b> · {person.cafe}</span>
          <Icon name="arrowRight" size={18} className="go" />
        </div>
      </div>
    </button>
  )
}

export function StoryModal({ s, onClose }) {
  const { navigate } = useApp()
  const person = s ? PEOPLE[s.person] : null
  return (
    <Modal open={!!s} onClose={onClose} label={person ? `${person.name}’s story` : 'Story'} width={900}>
      {s && (
        <div className="story-full">
          <div className="story-full-photo photo"><img src={photo(s.person, 900, 1100)} alt={`${person.name}, ${person.role.toLowerCase()} of ${person.cafe}`} /></div>
          <div className="story-full-body">
            <PlaceholderTag />
            <span className="kicker">{person.cafe} · {person.city}</span>
            <h2>{person.name}</h2>
            <p className="muted">{person.role}</p>
            <div className="story-full-block">
              <span className="label">Before</span>
              <p className="story-full-quote">{s.skeptic}</p>
            </div>
            <div className="story-full-block">
              <span className="label">What changed</span>
              <p>{s.win}</p>
            </div>
            <div className="story-full-stat"><span className="num">{s.stat}</span></div>
            <div className="story-full-block">
              <span className="label">The tools</span>
              <ul className="story-tools">
                {s.tools.map((id) => {
                  const p = getProduct(id)
                  return (
                    <li key={id}>
                      <a href={hrefFor('pantry', id)} onClick={(e) => { e.preventDefault(); onClose(); navigate('pantry', id) }}>
                        <IconTile p={p} size={26} /> {p.name} <Icon name="arrowRight" size={14} />
                      </a>
                    </li>
                  )
                })}
              </ul>
            </div>
            <p className="fine">This story is a stand-in until we interview real café owners. The name and photo are placeholders.</p>
          </div>
        </div>
      )}
    </Modal>
  )
}

/** Owner stories you can open; scrolls sideways when there are more than fit. */
export default function Stories({ stories, rail = false }) {
  const [open, setOpen] = useState(null)
  const cards = stories.map((s) => <StoryCard key={s.id} s={s} onOpen={setOpen} />)
  return (
    <>
      {rail ? <Rail label="Owner stories" width="minmax(280px, 340px)">{cards}</Rail> : <div className="story-grid">{cards}</div>}
      <StoryModal s={open} onClose={() => setOpen(null)} />
    </>
  )
}
