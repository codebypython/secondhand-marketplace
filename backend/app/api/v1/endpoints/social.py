from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.db.session import get_db_session
from app.models.listing import Listing
from app.models.social import ListingQuestion, Review, UserFollow, Wishlist, WishlistItem
from app.models.user import User
from app.schemas.social import (
    AnswerCreate,
    QuestionCreate,
    QuestionRead,
    ReviewCreate,
    ReviewRead,
    WishlistCreate,
    WishlistRead,
    WishlistItemRead,
)

router = APIRouter()

# Follows
@router.post("/users/{user_id}/follow", status_code=204)
def follow_user(
    user_id: UUID,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
        
    target = session.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
        
    existing = session.scalar(
        select(UserFollow).where(
            UserFollow.follower_id == current_user.id,
            UserFollow.following_id == user_id
        )
    )
    if not existing:
        follow = UserFollow(follower_id=current_user.id, following_id=user_id)
        session.add(follow)
        session.commit()

@router.delete("/users/{user_id}/follow", status_code=204)
def unfollow_user(
    user_id: UUID,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    follow = session.scalar(
        select(UserFollow).where(
            UserFollow.follower_id == current_user.id,
            UserFollow.following_id == user_id
        )
    )
    if follow:
        session.delete(follow)
        session.commit()

# Reviews
@router.post("/users/{user_id}/reviews", response_model=ReviewRead, status_code=201)
def create_review(
    user_id: UUID,
    payload: ReviewCreate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot review yourself")
        
    target = session.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
        
    from app.models.enums import DealStatus
    from app.models.transaction import Deal
    
    deal = session.get(Deal, payload.deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    if deal.status != DealStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Cannot review a deal that is not completed")
        
    # Verify participant roles
    if current_user.id not in {deal.buyer_id, deal.seller_id}:
        raise HTTPException(status_code=403, detail="You are not a participant in this deal")
        
    expected_target_id = deal.seller_id if current_user.id == deal.buyer_id else deal.buyer_id
    if user_id != expected_target_id:
        raise HTTPException(status_code=400, detail="Target user is not the other participant in this deal")
        
    # Check for duplicate reviews for this deal
    existing_review = session.scalar(
        select(Review).where(
            Review.deal_id == payload.deal_id,
            Review.reviewer_id == current_user.id
        )
     )
    if existing_review:
        raise HTTPException(status_code=400, detail="You have already reviewed this transaction")
        
    review = Review(
        reviewer_id=current_user.id,
        target_id=user_id,
        deal_id=payload.deal_id,
        rating=payload.rating,
        comment=payload.comment
    )
    session.add(review)
    session.commit()
    session.refresh(review)
    return session.scalar(select(Review).options(selectinload(Review.reviewer).selectinload(User.profile)).where(Review.id == review.id))

@router.get("/users/{user_id}/reviews", response_model=list[ReviewRead])
def get_user_reviews(
    user_id: UUID,
    session: Session = Depends(get_db_session),
) -> Any:
    stmt = (
        select(Review)
        .options(selectinload(Review.reviewer).selectinload(User.profile))
        .where(Review.target_id == user_id)
        .order_by(Review.created_at.desc())
    )
    return list(session.scalars(stmt))

# Wishlists
@router.post("/wishlists", response_model=WishlistRead, status_code=201)
def create_wishlist(
    payload: WishlistCreate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    wishlist = Wishlist(
        user_id=current_user.id,
        name=payload.name,
        is_public=payload.is_public
    )
    session.add(wishlist)
    session.commit()
    session.refresh(wishlist)
    return wishlist

@router.get("/wishlists/me", response_model=list[WishlistRead])
def get_my_wishlists(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    stmt = (
        select(Wishlist)
        .options(selectinload(Wishlist.items))
        .where(Wishlist.user_id == current_user.id)
        .order_by(Wishlist.created_at.desc())
    )
    return list(session.scalars(stmt))


@router.post("/wishlists/{wishlist_id}/items", response_model=WishlistItemRead, status_code=201)
def add_wishlist_item(
    wishlist_id: UUID,
    payload: dict,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    wishlist = session.get(Wishlist, wishlist_id)
    if not wishlist:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    if wishlist.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this wishlist")
        
    listing_id = payload.get("listing_id")
    if not listing_id:
        raise HTTPException(status_code=400, detail="listing_id is required")
        
    listing_uuid = UUID(listing_id) if isinstance(listing_id, str) else listing_id
    listing = session.get(Listing, listing_uuid)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
        
    existing = session.scalar(
        select(WishlistItem).where(
            WishlistItem.wishlist_id == wishlist_id,
            WishlistItem.listing_id == listing_uuid
        )
    )
    if existing:
        return existing
        
    item = WishlistItem(wishlist_id=wishlist_id, listing_id=listing_uuid)
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.delete("/wishlists/{wishlist_id}/items/{listing_id}", status_code=204)
def remove_wishlist_item(
    wishlist_id: UUID,
    listing_id: UUID,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    wishlist = session.get(Wishlist, wishlist_id)
    if not wishlist:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    if wishlist.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this wishlist")
        
    item = session.scalar(
        select(WishlistItem).where(
            WishlistItem.wishlist_id == wishlist_id,
            WishlistItem.listing_id == listing_id
        )
    )
    if item:
        session.delete(item)
        session.commit()


# Listing Q&A
@router.post("/listings/{listing_id}/questions", response_model=QuestionRead, status_code=201)
def ask_question(
    listing_id: UUID,
    payload: QuestionCreate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    listing = session.get(Listing, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
        
    question = ListingQuestion(
        listing_id=listing_id,
        asker_id=current_user.id,
        question=payload.question
    )
    session.add(question)
    session.commit()
    session.refresh(question)
    return session.scalar(select(ListingQuestion).options(selectinload(ListingQuestion.asker).selectinload(User.profile)).where(ListingQuestion.id == question.id))

@router.post("/listings/questions/{question_id}/answer", response_model=QuestionRead)
def answer_question(
    question_id: UUID,
    payload: AnswerCreate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    question = session.get(ListingQuestion, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    listing = session.get(Listing, question.listing_id)
    if listing.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the listing owner can answer questions")
        
    question.answer = payload.answer
    question.touch()
    session.commit()
    session.refresh(question)
    return session.scalar(select(ListingQuestion).options(selectinload(ListingQuestion.asker).selectinload(User.profile)).where(ListingQuestion.id == question.id))

@router.get("/listings/{listing_id}/questions", response_model=list[QuestionRead])
def get_listing_questions(
    listing_id: UUID,
    session: Session = Depends(get_db_session),
) -> Any:
    stmt = (
        select(ListingQuestion)
        .options(selectinload(ListingQuestion.asker).selectinload(User.profile))
        .where(ListingQuestion.listing_id == listing_id)
        .order_by(ListingQuestion.created_at.desc())
    )
    return list(session.scalars(stmt))
